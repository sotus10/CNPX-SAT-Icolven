// ============================================================================
// PROYECTO SAT - SISTEMA DE ALERTAS TEMPRANAS (NODO RECEPTOR)
// Colegio Adventista Icolven - Concurso Nacional de Programación Fedesoft 2026
// ============================================================================

#include <SPI.h>
#include <LoRa.h>

// ----------------------------------------------------------------------------
// CONFIGURACIÓN DE PINES (LILYGO TTGO T-BEAM ESP32)
// ----------------------------------------------------------------------------
// Pines del Módulo LoRa SX1276 Integrado
#define LORA_SCK   5
#define LORA_MISO  19
#define LORA_MOSI  27
#define LORA_SS    18
#define LORA_RST   23
#define LORA_DIO0  26

// Pines de Periféricos Actuadores
#define PIN_RELE   32  // Controla la sirena principal (GPIO32)
#define PIN_BUZZER 33  // Controla el buzzer piezoeléctrico KY-006 (GPIO33 / Pin 'S')

// Frecuencia LoRa (Banda Libre Colombia: 915 MHz)
#define LORA_FREQUENCY 915E6

// Tiempos de alerta para el Buzzer (ms)
#define BUZZER_TONO_AMARILLO 1000 // Frecuencia del tono en Hz
#define BUZZER_TONO_ALERTA   1800 // Frecuencia del tono en Hz para Naranja/Rojo

// Timeout de comunicación (20 minutos sin recibir mensajes)
#define TIMEOUT_SIN_COMUNICACION_MS (20UL * 60UL * 1000UL)

// ----------------------------------------------------------------------------
// CONFIGURACIÓN OPCIONAL DE BACKEND / WIFI (STUB)
// ----------------------------------------------------------------------------
#define WIFI_HABILITADO 0 // Cambiar a 1 cuando el Backend de Supabase esté listo

#if WIFI_HABILITADO
  #include <WiFi.h>
  #include <HTTPClient.h>
  const char* WIFI_SSID     = "NOMBRE_DE_LA_RED";
  const char* WIFI_PASSWORD = "CONTRASENA_AQUI";
  const char* BACKEND_URL   = "http://tu-backend.example.com/api/lecturas";
#endif

// ----------------------------------------------------------------------------
// VARIABLES GLOBALES DE ESTADO
// ----------------------------------------------------------------------------
unsigned long ultimoMensajeMs = 0;
bool avisoSinComunicacionMostrado = false;
String nivelActivo = "VERDE";

// Declaración de funciones
bool inicializarLoRa();
void revisarMensajesLoRa();
void procesarMensaje(const String &mensaje, int rssi);
void aplicarNivelDeAlerta(const String &nivel);
void sonarBuzzerIntermitente(int frecuenciaHz, int duracionOnMs, int duracionOffMs, int repeticiones);
void revisarTimeoutComunicacion();
void subirABackend(const String &nodo, const String &nivel, float distancia, float velocidad);

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println("  INICIALIZANDO NODO RECEPTOR (SAT ICOLVEN 2026)  ");
  Serial.println("==================================================");

  // Configuración de pines de salida
  pinMode(PIN_RELE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Estado inicial de seguridad: Apagados
  digitalWrite(PIN_RELE, LOW);
  noTone(PIN_BUZZER);

  // Inicializar comunicación LoRa
  if (!inicializarLoRa()) {
    Serial.println("[ERROR CRÍTICO] Falló la inicialización de LoRa.");
    while (!inicializarLoRa()) {
      delay(5000);
    }
  }
  Serial.println("[OK] Módulo LoRa SX1276 iniciado correctamente a 915 MHz.");

  // Configuración opcional de WiFi
#if WIFI_HABILITADO
  Serial.print("[WIFI] Conectando a ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long inicioWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicioWifi < 15000) {
    delay(300);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi conectado con éxito.");
  } else {
    Serial.println("\n[ADVERTENCIA] No se pudo conectar a WiFi. Continuando en modo P2P local.");
  }
#endif

  ultimoMensajeMs = millis();
  Serial.println("[SISTEMA LISTO] Esperando mensajes del sensor...");
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  revisarMensajesLoRa();
  revisarTimeoutComunicacion();
}

// ============================================================================
// FUNCIONES AUXILIARES Y LÓGICA DE CONTROL
// ============================================================================

bool inicializarLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  return LoRa.begin(LORA_FREQUENCY);
}

void revisarMensajesLoRa() {
  int tamanoPaquete = LoRa.parsePacket();
  if (tamanoPaquete == 0) return;

  String mensaje = "";
  while (LoRa.available()) {
    mensaje += (char)LoRa.read();
  }
  
  int rssi = LoRa.packetRssi();
  procesarMensaje(mensaje, rssi);
}

void procesarMensaje(const String &mensaje, int rssi) {
  // Validación de estructura esperada: NODO_ID,NIVEL,DISTANCIA,VELOCIDAD
  int primeraComa = mensaje.indexOf(',');
  int segundaComa = mensaje.indexOf(',', primeraComa + 1);
  int terceraComa = mensaje.indexOf(',', segundaComa + 1);

  // Descartar tramas corruptas por interferencia o ruido
  if (primeraComa < 0 || segundaComa < 0 || terceraComa < 0) {
    Serial.printf("[DESCARTE] Trama corrupta recibida: %s (RSSI: %d dBm)\n", mensaje.c_str(), rssi);
    return;
  }

  String nodo = mensaje.substring(0, primeraComa);
  String nivel = mensaje.substring(primeraComa + 1, segundaComa);
  float distancia = mensaje.substring(segundaComa + 1, terceraComa).toFloat();
  float velocidad = mensaje.substring(terceraComa + 1).toFloat();

  // Validar niveles conocidos
  if (nivel != "VERDE" && nivel != "AMARILLO" && nivel != "NARANJA" && nivel != "ROJO") {
    Serial.printf("[DESCARTE] Nivel de alerta no reconocido ('%s') en mensaje: %s\n", nivel.c_str(), mensaje.c_str());
    return;
  }

  // Actualizar temporizadores de estado activo
  ultimoMensajeMs = millis();
  avisoSinComunicacionMostrado = false;

  Serial.println("\n--------------------------------------------------");
  Serial.printf("[LORA RECIBIDO] Nodo: %s | RSSI: %d dBm\n", nodo.c_str(), rssi);
  Serial.printf("  -> Nivel: %s | Distancia: %.1f cm | Vel: %.2f cm/min\n", 
                nivel.c_str(), distancia, velocidad);
  Serial.println("--------------------------------------------------");

  aplicarNivelDeAlerta(nivel);

#if WIFI_HABILITADO
  subirABackend(nodo, nivel, distancia, velocidad);
#endif
}

void aplicarNivelDeAlerta(const String &nivel) {
  nivelActivo = nivel;

  if (nivel == "VERDE") {
    digitalWrite(PIN_RELE, LOW);
    noTone(PIN_BUZZER);
    Serial.println("[ESTADO ACTIVO] VERDE -> Sirena APAGADA | Buzzer APAGADO");
    return;
  }

  if (nivel == "AMARILLO") {
    digitalWrite(PIN_RELE, LOW); // Sirena apagada
    Serial.println("[ESTADO ACTIVO] AMARILLO -> Sirena APAGADA | Buzzer PREVENTIVO");
    sonarBuzzerIntermitente(BUZZER_TONO_AMARILLO, 200, 200, 3);
    return;
  }

  if (nivel == "NARANJA") {
    digitalWrite(PIN_RELE, HIGH); // Activa la sirena
    Serial.println("[ESTADO ACTIVO] NARANJA -> Sirena ACTIVADA | Buzzer ALERTA");
    sonarBuzzerIntermitente(BUZZER_TONO_ALERTA, 150, 100, 5);
    return;
  }

  if (nivel == "ROJO") {
    digitalWrite(PIN_RELE, HIGH); // Activa la sirena
    Serial.println("[ESTADO ACTIVO] ROJO -> ALERTA CRÍTICA | Sirena ACTIVADA | Buzzer CONTINUO");
    tone(PIN_BUZZER, BUZZER_TONO_ALERTA); // Tono continuo
    return;
  }
}

void sonarBuzzerIntermitente(int frecuenciaHz, int duracionOnMs, int duracionOffMs, int repeticiones) {
  for (int i = 0; i < repeticiones; i++) {
    tone(PIN_BUZZER, frecuenciaHz);
    delay(duracionOnMs);
    noTone(PIN_BUZZER);
    delay(duracionOffMs);
  }
}

void revisarTimeoutComunicacion() {
  if (millis() - ultimoMensajeMs > TIMEOUT_SIN_COMUNICACION_MS && !avisoSinComunicacionMostrado) {
    Serial.println("\n[ALERTA DE SISTEMA] ¡Atención! Se han superado los 20 minutos sin recibir reportes del Nodo Transmisor.");
    Serial.println("                    Verificar batería/panel solar del sensor en el río.");
    avisoSinComunicacionMostrado = true;
  }
}

void subirABackend(const String &nodo, const String &nivel, float distancia, float velocidad) {
#if WIFI_HABILITADO
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  String json = "{\"nodo_id\":\"" + nodo + "\",\"nivel\":\"" + nivel +
                "\",\"distancia_cm\":" + String(distancia, 1) +
                ",\"velocidad_cm_min\":" + String(velocidad, 2) + "}";

  int codigoRespuesta = http.POST(json);
  Serial.printf("[HTTP POST] Código de respuesta Backend: %d\n", codigoRespuesta);
  http.end();
#endif
}

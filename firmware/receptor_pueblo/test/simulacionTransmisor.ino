#include <WiFi.h>
#include <HTTPClient.h>

// ============================================================================
// CONFIGURACIÓN DE SIMULACIÓN Y CREDENCIALES
// ============================================================================
// Ajusta el nivel que deseas probar: "VERDE", "AMARILLO", "NARANJA", "ROJO"
const String SIM_NIVEL     = "ROJO";
const float  SIM_DIST_BASE = 70.3;       // Distancia base para el nivel
const float  SIM_VEL_BASE  = 212.71;     // Velocidad base para el nivel

const String NODO_ID         = "RIO_01";
const char*  WIFI_SSID       = "Ardila";
const char*  WIFI_PASSWORD   = "*HaJaSa*";
const char*  BACKEND_URL     = "http://192.168.1.18:8000/api/lecturas";
const char*  BACKEND_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuYWRya2t6dWNpbHR0bHBlcmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODkwMDMsImV4cCI6MjEwNTU2NTAwM30.rw-u0h2CHJE6f7MVyKQolh98HgOo4CHdFfumYndfbrE";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   INICIALIZANDO SIMULADOR DE LECTURAS (SAT)      ");
  Serial.println("==================================================");

  // Conectar a la red Wi-Fi
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
    Serial.println("\n[ADVERTENCIA] No se pudo conectar a WiFi.");
  }
}

void loop() {
  // 1. Generar variación aleatoria sutil (+/- 0.2 a 0.3 cm)
  float variacion = ((random(-3, 4)) / 10.0); // Devuelve entre -0.3 y +0.3
  float distanciaSimulada = SIM_DIST_BASE + variacion;
  float velocidadSimulada = SIM_VEL_BASE + (random(-10, 11) / 100.0);

  int rssiSimulado = random(-25, -20); // RSSI simulado (~ -23 dBm)

  // 2. Formatear salida en el Monitor Serie EXACTAMENTE igual al receptor real
  Serial.println("\n--------------------------------------------------");
  Serial.printf("[LORA RECIBIDO] Nodo: %s | RSSI: %d dBm\n", NODO_ID.c_str(), rssiSimulado);
  Serial.printf("  -> Nivel: %s | Distancia: %.1f cm | Vel: %.2f cm/min\n", 
                SIM_NIVEL.c_str(), distanciaSimulada, velocidadSimulada);
  Serial.println("--------------------------------------------------");

  // 3. Imprimir estado del nivel activo
  if (SIM_NIVEL == "VERDE") {
    Serial.println("[ESTADO ACTIVO] VERDE -> Sirena APAGADA | Buzzer APAGADO");
  } else if (SIM_NIVEL == "AMARILLO") {
    Serial.println("[ESTADO ACTIVO] AMARILLO -> Sirena APAGADA | Buzzer PREVENTIVO");
  } else if (SIM_NIVEL == "NARANJA") {
    Serial.println("[ESTADO ACTIVO] NARANJA -> Sirena ACTIVADA | Buzzer ALERTA");
  } else if (SIM_NIVEL == "ROJO") {
    Serial.println("[ESTADO ACTIVO] ROJO -> ALERTA CRÍTICA | Sirena ACTIVADA | Buzzer CONTINUO");
  }

  // 4. Subir a Backend exactamente como la función subirABackend() de tu proyecto
  if (WiFi.status() == WL_CONNECTED) {
    // Mismo texto plano que se parsea en el receptor: NODO_ID,NIVEL,DISTANCIA,VELOCIDAD
    String cuerpo = NODO_ID + "," + SIM_NIVEL + "," + String(distanciaSimulada, 1) + "," + String(velocidadSimulada, 2);

    HTTPClient http;
    http.begin(BACKEND_URL);
    http.setTimeout(20000);
    http.addHeader("Content-Type", "text/plain");
    http.addHeader("X-API-Key", BACKEND_API_KEY);

    int codigo = http.POST(cuerpo);
    Serial.printf("[HTTP POST] %s -> Backend respondio: %d (201 = OK)\n", cuerpo.c_str(), codigo);

    if (codigo > 0) {
      Serial.println(http.getString());
    } else {
      Serial.printf("[HTTP] Error de conexion: %s\n", HTTPClient::errorToString(codigo).c_str());
    }

    http.end();
  } else {
    Serial.println("[WIFI] Sin conexión a la red local.");
  }

  delay(3000); // Frecuencia de prueba
}

/*
1. Para probar nivel VERDE ($> 82.9\text{ cm}$)C++const String SIM_NIVEL     = "VERDE";
const float  SIM_DIST_BASE = 87.2;       // Distancia en cm (86.9 a 87.5 cm)
const float  SIM_VEL_BASE  = 0.15;       // Velocidad simulada
*/

/*
const String SIM_NIVEL     = "AMARILLO";
const float  SIM_DIST_BASE = 80.5;       // Distancia en cm (80.2 a 80.8 cm)
const float  SIM_VEL_BASE  = 12.40;      // Velocidad simulada
*/

/*
const String SIM_NIVEL     = "NARANJA";
const float  SIM_DIST_BASE = 75.1;       // Distancia en cm (74.8 a 75.4 cm)
const float  SIM_VEL_BASE  = 68.30;      // Velocidad simulada
*/

/*
Para probar nivel ROJO ($\le 72.6\text{ cm}$)C++const String SIM_NIVEL     = "ROJO";
const float  SIM_DIST_BASE = 70.3;       // Distancia en cm (70.0 a 70.6 cm)
const float  SIM_VEL_BASE  = 212.71;     // Velocidad simulada
*/
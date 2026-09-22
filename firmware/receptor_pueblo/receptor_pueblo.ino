#include <SPI.h> 
#include <LoRa.h> 
#define PIN_RELE 32 
#define PIN_BUZZER 33 
#define LORA_SCK 5 
#define LORA_MISO 19 
#define LORA_MOSI 27 
#define LORA_SS 18 
#define LORA_RST 23 
#define LORA_DIO0 26 
#define LORA_FREQUENCY 915E6 
#define BUZZER_ON_MS_AMARILLO 150 
#define BUZZER_ON_MS_ALERTA 400 
#define TIMEOUT_SIN_COMUNICACION_MS (20UL * 60UL * 1000UL) 
#define WIFI_HABILITADO 0 
#if WIFI_HABILITADO 
#include <WiFi.h> 
#include <HTTPClient.h> 
const char* WIFI_SSID     = "NOMBRE_DE_LA_RED"; 
const char* WIFI_PASSWORD = "CONTRASENA"; 
const char* BACKEND_URL   = "http://tu-backend.example.com/api/lecturas"; 
#endif 
unsigned long ultimoMensajeMs = 0; 
bool avisoSinComunicacionMostrado = false; 
String nivelActivo = "VERDE"; 
bool   inicializarLoRa(); 
 
void   revisarMensajesLoRa(); 
 
void   procesarMensaje(const String &mensaje, int rssi); 
 
void   aplicarNivelDeAlerta(const String &nivel); 
 
void   sonarBuzzer(int duracion_ms); 
 
void   revisarTimeoutComunicacion(); 
 
void   subirABackend(const String &nodo, const String &nivel, float distancia, float velocidad); 
 
void setup() { 
 
  Serial.begin(115200); 
 
  delay(200); 
 
  pinMode(PIN_RELE, OUTPUT); 
 
  pinMode(PIN_BUZZER, OUTPUT); 
 
  digitalWrite(PIN_RELE, LOW); 
 
  digitalWrite(PIN_BUZZER, LOW); 
 
  if (!inicializarLoRa()) { 
 
    while (!inicializarLoRa()) { delay(5000); } 
 
  } 
 
  #if WIFI_HABILITADO 
 
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD); 
 
    unsigned long inicioWifi = millis(); 
 
    while (WiFi.status() != WL_CONNECTED && millis() - inicioWifi < 15000) delay(300); 
 
  #endif 
 
  ultimoMensajeMs = millis(); 
 
} 
 
void loop() { 
 
  revisarMensajesLoRa(); 
 
  revisarTimeoutComunicacion(); 
 
} 
 
bool inicializarLoRa() { 
 
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS); 
 
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0); 
 
  return LoRa.begin(LORA_FREQUENCY); 
 
} 
 
void revisarMensajesLoRa() { 
 
  int tamanoPaquete = LoRa.parsePacket(); 
 
  if (tamanoPaquete == 0) return; 
 
  String mensaje = ""; 
 
  while (LoRa.available()) mensaje += (char)LoRa.read(); 
 
  int rssi = LoRa.packetRssi(); 
 
  procesarMensaje(mensaje, rssi); 
 
} 
 
void procesarMensaje(const String &mensaje, int rssi) { 
 
  int primeraComa = mensaje.indexOf(','); 
 
  int segundaComa  = mensaje.indexOf(',', primeraComa + 1); 
 
  int terceraComa  = mensaje.indexOf(',', segundaComa + 1); 
 
  if (primeraComa < 0 || segundaComa < 0 || terceraComa < 0) return; 
 
  String nodo     = mensaje.substring(0, primeraComa); 
 
  String nivel    = mensaje.substring(primeraComa + 1, segundaComa); 
 
  float distancia = mensaje.substring(segundaComa + 1, terceraComa).toFloat(); 
 
  float velocidad = mensaje.substring(terceraComa + 1).toFloat(); 
 
  if (nivel != "VERDE" && nivel != "AMARILLO" && nivel != "NARANJA" && nivel != "ROJO") 
return; 
 
  ultimoMensajeMs = millis(); 
 
  avisoSinComunicacionMostrado = false; 
 
  aplicarNivelDeAlerta(nivel); 
 
  #if WIFI_HABILITADO 
 
    subirABackend(nodo, nivel, distancia, velocidad); 
 
  #endif 
 
} 
 
void aplicarNivelDeAlerta(const String &nivel) { 
 
  nivelActivo = nivel; 
 
  if (nivel == "VERDE") { 
 
    digitalWrite(PIN_RELE, LOW); 
 
    digitalWrite(PIN_BUZZER, LOW); 
 
    return; 
 
  } 
 
  if (nivel == "AMARILLO") { 
 
    digitalWrite(PIN_RELE, LOW); 
 
    sonarBuzzer(BUZZER_ON_MS_AMARILLO); 
 
    return; 
 
  } 
 
  digitalWrite(PIN_RELE, HIGH); 
 
  sonarBuzzer(BUZZER_ON_MS_ALERTA); 
 
} 
 
void sonarBuzzer(int duracion_ms) { 
 
  digitalWrite(PIN_BUZZER, HIGH); 
 
  delay(duracion_ms); 
 
  digitalWrite(PIN_BUZZER, LOW); 
 
} 
 
void revisarTimeoutComunicacion() { 
 
  if (millis() - ultimoMensajeMs > TIMEOUT_SIN_COMUNICACION_MS && 
!avisoSinComunicacionMostrado) { 
 
    Serial.println("ALERTA: sin mensajes del transmisor hace rato."); 
 
    avisoSinComunicacionMostrado = true; 
 
  } 
 
} 
 
void subirABackend(const String &nodo, const String &nivel, float distancia, float velocidad) { 
 
  #if WIFI_HABILITADO 
 
    if (WiFi.status() != WL_CONNECTED) return; 
 
    HTTPClient http; 
 
    http.begin(BACKEND_URL); 
 
    http.addHeader("Content-Type", "application/json"); 
 
    String json = "{\"nodo\":\"" + nodo + "\",\"nivel\":\"" + nivel + 
 
                  "\",\"distancia_cm\":" + String(distancia, 1) + 
 
                  ",\"velocidad_cm_min\":" + String(velocidad, 2) + "}"; 
 
    int codigoRespuesta = http.POST(json); 
 
    http.end(); 
 
  #endif 
 
} 

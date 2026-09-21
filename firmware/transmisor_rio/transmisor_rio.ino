#include <SPI.h> 
#include <LoRa.h> 
#include <esp_sleep.h> 
#define PIN_TRIG 25 
#define PIN_ECHO 13 
#define LORA_SCK 5 
#define LORA_MISO 19 
#define LORA_MOSI 27 
#define LORA_SS 18 
#define LORA_RST 23 
#define LORA_DIO0  26 
#define LORA_FREQUENCY 915E6 
#define NODE_ID  "RIO_01" 
#define MEDICIONES_POR_CICLO 5 
#define TIMEOUT_ECO_US 30000 
#define INTERVALO_NORMAL_SEG 600 
#define INTERVALO_ALERTA_SEG 60 
#define UMBRAL_AMARILLO_CM 80.0 
#define UMBRAL_NARANJA_CM 50.0 
#define UMBRAL_ROJO_CM 30.0 
#define VELOCIDAD_PELIGROSA_CM_MIN   5.0 
#define DISTANCIA_MIN_VALIDA_CM   2.0 
#define DISTANCIA_MAX_VALIDA_CM   450.0 
RTC_DATA_ATTR float    distanciaAnterior_cm   = -1; 
RTC_DATA_ATTR uint64_t segundosDelCicloAnterior = INTERVALO_NORMAL_SEG; 
RTC_DATA_ATTR uint32_t numeroDeCiclo          
bool   inicializarLoRa(); 
float  medirDistanciaPromedio_cm(); 
float  medirUnaVezDistancia_cm(); 
= 0; 
String calcularNivelAlerta(float distancia_cm, float velocidad_cm_min); 
void   enviarAlertaLoRa(const String &nivel, float distancia_cm, float velocidad_cm_min); 
void   dormir(uint64_t segundos); 
void setup() { 
Serial.begin(115200); 
delay(200); 
numeroDeCiclo++; 
Serial.println(); 
  Serial.printf("Ciclo #%u\n", numeroDeCiclo); 
 
  pinMode(PIN_TRIG, OUTPUT); 
 
  pinMode(PIN_ECHO, INPUT); 
 
  digitalWrite(PIN_TRIG, LOW); 
 
  if (!inicializarLoRa()) { 
 
    Serial.println("ERROR: LoRa no inició."); 
 
    dormir(INTERVALO_NORMAL_SEG); 
 
    return; 
 
  } 
 
  float distancia_cm = medirDistanciaPromedio_cm(); 
 
  if (distancia_cm < 0) { 
 
    Serial.println("ADVERTENCIA: sensor sin lectura válida."); 
 
    dormir(INTERVALO_NORMAL_SEG); 
 
    return; 
 
  } 
 
  float velocidad_cm_min = 0; 
 
  if (distanciaAnterior_cm >= 0) { 
 
    float minutosTranscurridos = segundosDelCicloAnterior / 60.0f; 
 
    float deltaCm = distanciaAnterior_cm - distancia_cm; 
 
    velocidad_cm_min = deltaCm / minutosTranscurridos; 
 
  } 
 
  String nivel = calcularNivelAlerta(distancia_cm, velocidad_cm_min); 
 
  enviarAlertaLoRa(nivel, distancia_cm, velocidad_cm_min); 
 
  distanciaAnterior_cm = distancia_cm; 
 
  uint64_t proximoIntervalo = (nivel == "VERDE") ? INTERVALO_NORMAL_SEG : INTERVALO_ALERTA_SEG; 
 
  segundosDelCicloAnterior = proximoIntervalo; 
 
  dormir(proximoIntervalo); 
 
} 
 
void loop() {} 
 
bool inicializarLoRa() { 
 
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS); 
 
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0); 
 
  return LoRa.begin(LORA_FREQUENCY); 
 
} 
 
float medirDistanciaPromedio_cm() { 
 
  float suma = 0; 
 
  int lecturasValidas = 0; 
 
  for (int i = 0; i < MEDICIONES_POR_CICLO; i++) { 
 
    float d = medirUnaVezDistancia_cm(); 
 
    if (d >= DISTANCIA_MIN_VALIDA_CM && d <= DISTANCIA_MAX_VALIDA_CM) { 
 
      suma += d; 
 
      lecturasValidas++; 
 
    } 
 
    delay(60); 
 
  } 
 
  if (lecturasValidas == 0) return -1; 
 
  return suma / lecturasValidas; 
 
} 
 
float medirUnaVezDistancia_cm() { 
 
  digitalWrite(PIN_TRIG, LOW); 
 
  delayMicroseconds(2); 
 
  digitalWrite(PIN_TRIG, HIGH); 
 
  delayMicroseconds(10); 
 
  digitalWrite(PIN_TRIG, LOW); 
 
  long duracion_us = pulseIn(PIN_ECHO, HIGH, TIMEOUT_ECO_US); 
 
  if (duracion_us == 0) return -1; 
 
  return (duracion_us * 0.0343f) / 2.0f; 
 
} 
 
String calcularNivelAlerta(float distancia_cm, float velocidad_cm_min) { 
 
  if (distancia_cm <= UMBRAL_ROJO_CM)    return "ROJO"; 
 
  if (distancia_cm <= UMBRAL_NARANJA_CM) return "NARANJA"; 
 
  bool subiendoRapido = (velocidad_cm_min >= VELOCIDAD_PELIGROSA_CM_MIN); 
 
  if (distancia_cm <= UMBRAL_AMARILLO_CM) return subiendoRapido ? "NARANJA" : "AMARILLO"; 
 
  if (subiendoRapido) return "AMARILLO"; 
 
  return "VERDE"; 
 
} 
 
void enviarAlertaLoRa(const String &nivel, float distancia_cm, float velocidad_cm_min) { 
 
  String mensaje = String(NODE_ID) + "," + nivel + "," + String(distancia_cm, 1) + "," + String(velocidad_cm_min, 2); 
 
  LoRa.beginPacket(); 
 
  LoRa.print(mensaje); 
 
  LoRa.endPacket(); 
 
  Serial.println("Enviado: " + mensaje); 
 
} 
 
void dormir(uint64_t segundos) { 
 
  Serial.printf("Durmiendo %llu segundos...\n", segundos); 
 
  Serial.flush(); 
 
  esp_sleep_enable_timer_wakeup(segundos * 1000000ULL); 
 
  esp_deep_sleep_start(); 
 
}
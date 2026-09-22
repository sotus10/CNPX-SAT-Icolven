// ============================================
// PRUEBA DEL SENSOR - Con Protección en Echo
// ============================================
#include <HardwareSerial.h>

#define RXD2 13 // Protegido mediante divisor de voltaje (1k + 2k)
#define TXD2 15
#define NODE_ID "RIO_01"

// Umbrales de nivel de alerta
#define UMBRAL_AMARILLO_CM 80.0
#define UMBRAL_NARANJA_CM 50.0
#define UMBRAL_ROJO_CM 30.0
#define VELOCIDAD_PELIGROSA_CM_MIN 5.0

HardwareSerial SensorSerial(2);

float distanciaAnterior_cm = -1.0;
unsigned long ultimoTiempoMs = 0;

String calcularNivelAlerta(float distancia_cm, float velocidad_cm_min) {
  if (distancia_cm <= UMBRAL_ROJO_CM) return "ROJO";
  if (distancia_cm <= UMBRAL_NARANJA_CM) return "NARANJA";
  bool subiendoRapido = (velocidad_cm_min >= VELOCIDAD_PELIGROSA_CM_MIN);
  if (distancia_cm <= UMBRAL_AMARILLO_CM) return subiendoRapido ? "NARANJA" : "AMARILLO";
  if (subiendoRapido) return "AMARILLO";
  return "VERDE";
}

void setup() {
  Serial.begin(115200);
  SensorSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("==================================================");
  Serial.println("Prueba del sensor JSN-SR04T (Entrada RXD2 protegida)");
  Serial.println("==================================================");
}

void loop() {
  if (SensorSerial.available()) {
    int primerByte = SensorSerial.peek();

    if (primerByte == 0xFF && SensorSerial.available() >= 4) {
      SensorSerial.read(); // Consume cabecera 0xFF
      uint8_t dataH = SensorSerial.read();
      uint8_t dataL = SensorSerial.read();
      uint8_t checksum = SensorSerial.read();

      uint8_t sumaCalculada = (0xFF + dataH + dataL) & 0xFF;

      if (sumaCalculada == checksum) {
        int distanciaMM = (dataH << 8) | dataL;
        float distancia_cm = distanciaMM / 10.0f;
        unsigned long tiempoActualMs = millis();

        float velocidad_cm_min = 0.0f;
        if (distanciaAnterior_cm >= 0.0f && ultimoTiempoMs > 0) {
          float minutosTranscurridos = (tiempoActualMs - ultimoTiempoMs) / 60000.0f;
          if (minutosTranscurridos > 0) {
            float deltaCm = distanciaAnterior_cm - distancia_cm;
            velocidad_cm_min = deltaCm / minutosTranscurridos;
          }
        }

        String nivel = calcularNivelAlerta(distancia_cm, velocidad_cm_min);

        distanciaAnterior_cm = distancia_cm;
        ultimoTiempoMs = tiempoActualMs;

        Serial.printf("\n[LECTURA PROTEGIDA] Distancia: %.1f cm | Vel: %.2f cm/min | Nivel: %s\n", 
                      distancia_cm, velocidad_cm_min, nivel.c_str());

        Serial.println("{");
        Serial.printf("  \"nodo_id\": \"%s\",\n", NODE_ID);
        Serial.printf("  \"nivel\": \"%s\",\n", nivel.c_str());
        Serial.printf("  \"distancia_cm\": %.1f,\n", distancia_cm);
        Serial.printf("  \"velocidad_cm_min\": %.2f,\n", velocidad_cm_min);
        Serial.println("  \"timestamp\": \"2026-09-22T08:30:00Z\"");
        Serial.println("}");

      } else {
        Serial.println("[ERROR] Checksum incorrecto.");
      }
    } else if (primerByte != 0xFF) {
      SensorSerial.read();
    }
  }

  delay(2000);
}
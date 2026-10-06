// ============================================================================
// PROYECTO SAT - NODO TRANSMISOR (SENSOR RÍO)
// Colegio Adventista Icolven - Concurso Nacional de Programación Fedesoft 2026
// ============================================================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <LoRa.h>

// ----------------------------------------------------------------------------
// CONFIGURACIÓN DE PINES (ESP32 TRANSMISOR)
// ----------------------------------------------------------------------------
// Sensor Ultrasonico JSN-SR04T Waterproof
const int TRIG_PIN = 25; // Cable azul
const int ECHO_PIN = 13; // Cable naranja (con divisor de voltaje)

// Pines del Módulo LoRa SX1276 Integrado o Externo en ESP32
#define LORA_SCK   5
#define LORA_MISO  19
#define LORA_MOSI  27
#define LORA_SS    18
#define LORA_RST   23
#define LORA_DIO0  26

#define LORA_FREQUENCY 915E6
#define NODO_ID "RIO_01"

// Dirección I2C estándar de la pantalla LCD (0x27 o 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Variables para cálculo de velocidad del agua
float ultimaDistancia = -1.0;
unsigned long ultimoTiempoMs = 0;

// Umbrales de alerta según distancia al agua (ajustar según la altura real de tu río/maqueta)
const float UMBRAL_AMARILLO = 80.0; // cm (ej: empieza a crecer)
const float UMBRAL_NARANJA  = 50.0; // cm (ej: alerta moderada)
const float UMBRAL_ROJO     = 20.0;  // cm (ej: desbordamiento inminente)

// Declaración de funciones
float tomarLecturaCruda();
float obtenerMediana();
String determinarNivel(float distancia);
bool inicializarLoRa();

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println("  INICIALIZANDO NODO TRANSMISOR (SAT ICOLVEN)  ");
  Serial.println("==================================================");

  // Inicializar pines del sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW); // Nota: corregido a digitalWrite abajo

  // Inicializar comunicación I2C (SDA=21, SCL=22)
  Wire.begin(21, 22);
  
  // Inicializar pantalla LCD
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print(" SAT ICOLVEN ");
  lcd.setCursor(0, 1);
  lcd.print("Iniciando LoRa..");

  // Inicializar LoRa
  if (!inicializarLoRa()) {
    Serial.println("[ERROR CRÍTICO] No se pudo iniciar LoRa en el transmisor.");
    lcd.setCursor(0, 1);
    lcd.print("Error LoRa!     ");
    while (1) { delay(1000); }
  }
  Serial.println("[OK] LoRa Transmisor listo en 915 MHz.");

  lcd.setCursor(0, 1);
  lcd.print("LoRa Conectado  ");
  delay(2000);
  lcd.clear();

  ultimoTiempoMs = millis();
}

void loop() {
  float distancia = obtenerMediana();

  // Calcular velocidad de cambio del nivel del agua (cm por minuto)
  float velocidad = 0.0;
  unsigned long tiempoActual = millis();
  
  if (distancia > 0 && ultimaDistancia > 0) {
    float deltaDistancia = ultimaDistancia - distancia; // Positivo = baja el agua, Negativo = sube el agua
    float deltaTimeMinutos = (tiempoActual - ultimoTiempoMs) / 60000.0;
    if (deltaTimeMinutos > 0) {
      velocidad = deltaDistancia / deltaTimeMinutos;
    }
  }
  
  if (distancia > 0) {
    ultimaDistancia = distancia;
    ultimoTiempoMs = tiempoActual;
  }

  // Determinar el nivel de alerta
  String nivel = determinarNivel(distancia);

  // 1. Mostrar en Monitor Serie
  if (distancia < 0) {
    Serial.println("[ALERTA] Zona ciega (< 20 cm) o sin eco.");
  } else {
    Serial.printf("Distancia: %.1f cm | Vel: %.2f cm/min | Nivel: %s\n", distancia, velocidad, nivel.c_str());
  }

  // 2. Transmitir por LoRa si la lectura es válida
  if (distancia > 0) {
    String tramaLoRa = String(NODO_ID) + "," + nivel + "," + String(distancia, 1) + "," + String(velocidad, 2);
    
    LoRa.beginPacket();
    LoRa.print(tramaLoRa);
    LoRa.endPacket();

    Serial.printf("[LORA ENVIADO] %s\n", tramaLoRa.c_str());
  }

  // 3. Mostrar en Pantalla LCD
  lcd.setCursor(0, 0);
  lcd.print("Nivel: ");
  lcd.print(nivel);
  lcd.print("   "); // Limpiar caracteres sobrantes

  lcd.setCursor(0, 1);
  if (distancia < 0) {
    lcd.print("ERR: Sin Eco    ");
  } else {
    char buffer[17];
    snprintf(buffer, sizeof(buffer), "D:%.1fcm V:%.0f", distancia, velocidad);
    lcd.print(buffer);
  }

  delay(2000); // Pausa de 2 segundos entre lecturas y envíos LoRa
}

// ----------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// ----------------------------------------------------------------------------

bool inicializarLoRa() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  return LoRa.begin(LORA_FREQUENCY);
}

float tomarLecturaCruda() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(20);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duracion = pulseIn(ECHO_PIN, HIGH, 60000); 
  if (duracion < 1160 || duracion == 0) return -1.0; 
  
  return (duracion * 0.0343) / 2.0;
}

float obtenerMediana() {
  float muestras[5];
  int validas = 0;

  for (int i = 0; i < 5; i++) {
    float lectura = tomarLecturaCruda();
    if (lectura > 0) {
      muestras[validas] = lectura;
      validas++;
    }
    delay(40);
  }

  if (validas == 0) return -1.0;

  for (int i = 0; i < validas - 1; i++) {
    for (int j = i + 1; j < validas; j++) {
      if (muestras[i] > muestras[j]) {
        float temp = muestras[i];
        muestras[i] = muestras[j];
        muestras[j] = temp;
      }
    }
  }

  return muestras[validas / 2];
}

String determinarNivel(float distancia) {
  if (distancia < 0) return "VERDE"; // Si falla el sensor, por seguridad no dispara falso positivo
  if (distancia <= UMBRAL_ROJO)     return "ROJO";
  if (distancia <= UMBRAL_NARANJA)  return "NARANJA";
  if (distancia <= UMBRAL_AMARILLO) return "AMARILLO";
  return "VERDE";
}

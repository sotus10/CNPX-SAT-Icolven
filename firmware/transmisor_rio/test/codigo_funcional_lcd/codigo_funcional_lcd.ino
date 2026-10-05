#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pines del Sensor JSN-SR04T
const int TRIG_PIN = 25; // Cable azul
const int ECHO_PIN = 13; // Cable naranja (divisor de voltaje)

// Dirección I2C estándar (0x27). Si la pantalla no enciende texto, cambia a 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Toma una lectura rápida del sensor
float tomarLecturaCruda() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(20);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duracion = pulseIn(ECHO_PIN, HIGH, 60000); // Timeout max ~10m
  if (duracion < 1160 || duracion == 0) return -1.0;       // Ignorar zona ciega (<20cm)
  
  return (duracion * 0.0343) / 2.0;
}

// Filtro de Mediana (5 lecturas)
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

  // Ordenar de menor a mayor
  for (int i = 0; i < validas - 1; i++) {
    for (int j = i + 1; j < validas; j++) {
      if (muestras[i] > muestras[j]) {
        float temp = muestras[i];
        muestras[i] = muestras[j];
        muestras[j] = temp;
      }
    }
  }

  return muestras[validas / 2]; // Devuelve el valor del centro
}

void setup() {
  Serial.begin(115200);

  // Inicializar pines del sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // Inicializar comunicación I2C (SDA=21, SCL=22)
  Wire.begin(21, 22);
  
  // Inicializar pantalla LCD
  lcd.init();
  lcd.backlight();

  // Mensaje de inicio en pantalla
  lcd.setCursor(0, 0);
  lcd.print("  PRUEBA  SAT   ");
  lcd.setCursor(0, 1);
  lcd.print("Sensor + LCD OK ");
  
  delay(2000);
  lcd.clear();
}

void loop() {
  float distancia = obtenerMediana();

  // 1. Mostrar en Monitor Serie
  if (distancia < 0) {
    Serial.println("[ALERTA] Zona ciega (< 20 cm) o sin eco.");
  } else {
    Serial.print("Distancia: ");
    Serial.print(distancia, 1);
    Serial.println(" cm");
  }

  // 2. Mostrar en Pantalla LCD
  lcd.setCursor(0, 0);
  lcd.print("DISTANCIA RIO:  ");

  lcd.setCursor(0, 1);
  if (distancia < 0) {
    lcd.print("<20cm / ERROR   ");
  } else {
    lcd.print("   ");
    lcd.print(distancia, 1);
    lcd.print(" cm      "); // Espacios para borrar números sobrantes
  }

  delay(600); // Actualización de pantalla cada 0.6 segundos
}
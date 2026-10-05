"""Verifica que el esquema de notificaciones push esté aplicado en Supabase.

El backend corre con un token rol `anon`, y PostgREST no permite DDL. Por eso este
script no crea nada: confirma si `backend/sql/dispositivos_push.sql` ya se corrió
a mano en el editor de Supabase, para poder diagnosticar los 404 del registro.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_client import supabase  # noqa: E402

COLUMNAS_ESPERADAS = {
    "dispositivos_push": {
        "id",
        "suscripcion_json",
        "vapid_public_key",
        "canal",
        "estado",
        "ultimo_error",
        "envios_exitosos",
        "envios_fallidos",
        "etiqueta",
        "created_at",
        "updated_at",
    },
    "notificaciones_alertas": {"dispositivo_id", "error_envio"},
}


def main() -> int:
    if supabase is None:
        print("Supabase no está disponible")
        return 1

    problemas = 0
    for tabla, esperadas in COLUMNAS_ESPERADAS.items():
        try:
            respuesta = supabase.table(tabla).select("*").limit(1).execute()
        except Exception as error:  # noqa: BLE001
            print(f"[FALTA] {tabla}: {str(error)[:150]}")
            problemas += 1
            continue

        if respuesta.data is None:
            # Sin filas no se puede inspeccionar el esquema: se consulta con count.
            try:
                respuesta = supabase.table(tabla).select("*", count="exact").limit(1).execute()
            except Exception as error:  # noqa: BLE001
                print(f"[FALTA] {tabla}: {str(error)[:150]}")
                problemas += 1
                continue

        print(f"[OK]    {tabla} responde")
        if tabla == "dispositivos_push":
            dispositivos = supabase.table("dispositivos_push").select("id, estado").execute()
            print(f"        dispositivos: {len(dispositivos.data or [])}")
        else:
            muestra = supabase.table(tabla).select("dispositivo_id").limit(5).execute()
            for fila in muestra.data or []:
                if fila.get("dispositivo_id") is not None:
                    break
            else:
                print("        columna dispositivo_id presente (sin pushed aún)")

    print(
        "\nSi falta algo, corre backend/sql/dispositivos_push.sql en el editor SQL de "
        "Supabase y vuelve a ejecutar este script."
    )
    return 1 if problemas else 0


if __name__ == "__main__":
    raise SystemExit(main())

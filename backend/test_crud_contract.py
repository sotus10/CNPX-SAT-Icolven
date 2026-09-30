import unittest
from unittest.mock import patch

import crud


class FakeTable:
    def __init__(self):
        self.inserted = None
        self.updated = None
        self.filters = []

    def insert(self, record):
        self.inserted = record
        return self

    def update(self, record):
        self.updated = record
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def execute(self):
        return type("Response", (), {"data": [{"id": "raw-id"}]})()


class FakeSupabase:
    def __init__(self):
        self.tables = {}

    def table(self, name):
        self.tables.setdefault(name, FakeTable())
        return self.tables[name]


class CrudContractTests(unittest.TestCase):
    def test_raw_insert_uses_live_columns_and_keeps_full_payload(self):
        client = FakeSupabase()
        payload = {
            "nodo_id": "RIO_01",
            "distancia_cm": "dato corrupto",
            "velocidad_cm_min": 1.25,
            "nivel": "ROJO",
        }
        with patch.object(crud, "supabase", client):
            raw_id = crud.insertar_lectura_cruda(payload)

        self.assertEqual(raw_id, "raw-id")
        self.assertEqual(client.tables["lecturas_crudas"].inserted, {
            "nodo_id": None,
            "nodo_codigo": "RIO_01",
            "distancia_cm": None,
            "velocidad_cm_min": 1.25,
            "datos_recibidos": payload,
        })

    def test_raw_row_can_be_linked_after_node_lookup(self):
        client = FakeSupabase()
        with patch.object(crud, "supabase", client):
            crud.asociar_lectura_cruda_nodo("raw-id", "node-id")

        table = client.tables["lecturas_crudas"]
        self.assertEqual(table.updated, {"nodo_id": "node-id"})
        self.assertEqual(table.filters, [("id", "raw-id")])


if __name__ == "__main__":
    unittest.main()

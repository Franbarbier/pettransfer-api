# IMPO Template Tables

Estas tablas guardan templates de cotización IMPO parseados desde archivos como:

- `cot_impo_arg_1.json`
- `cot_impo_col_bog_1.json`
- `cot_impo_mex_mex_1_puppy.json`

La idea es separar:

- la familia lógica del template
- el archivo/template concreto
- los ítems cotizables
- los textos largos del template
- el catálogo canónico para unificar labels variables

## Relación general

```text
quote_template_groups
  -> quote_templates
    -> quote_template_items
      -> quote_template_item_details
    -> quote_template_sections

quote_template_item_catalog
  -> quote_template_items
```

## `quote_template_groups`

Representa una situación lógica, independiente del archivo puntual.

Ejemplos:

- `argentina / null / 1 / 1_pet`
- `colombia / bog / 1 / 1_pet`
- `mexico / mex / 1 / 1_pet_puppy`

Columnas principales:

- `template_group_id`: id estable del grupo
- `country`: país normalizado (`argentina`, `mexico`, etc.)
- `location`: location opcional (`bog`, `clo`, `mex`, `gru`, etc.)
- `animal_count`: cantidad de mascotas si aplica
- `situation_key`: clave lógica (`1_pet`, `2_pets`, `1_pet_puppy`, etc.)
- `title`: nombre corto del grupo
- `source_family`: hoy `impo`

## `quote_templates`

Representa el archivo/template concreto.

Acá vive lo que cambia por variante:

- `default`
- `esp`
- `notice`
- `puppy`

Columnas principales:

- `template_id`: id estable del template
- `template_group_id`: FK a `quote_template_groups`
- `template_code`: código tipo `cot_impo_arg_1`
- `variant`: variante del template
- `parser_status`: estado del parseo (`parsed`, `unsupported`, etc.)
- `file_name`: nombre del JSON generado
- `relative_path`: path del JSON generado
- `source_file_name`: archivo fuente original
- `source_relative_path`: ruta relativa del fuente original
- `source_extension`: `xls`, `xlsx`, `msg`
- `currency`: moneda principal si se pudo detectar
- `quoted_total_amount`: total principal si se pudo detectar
- `metadata_json`: cabecera parseada
- `total_json`: total completo parseado
- `notes_json`: respaldo JSON de notas si hiciera falta
- `raw_json`: payload completo del template parseado

## `quote_template_item_catalog`

Catálogo canónico para unificar ítems que hoy aparecen con labels parecidos pero no idénticos.

Ejemplos de candidatos:

- `customs_clearance`
- `import_taxes`
- `home_delivery`
- `vet_fees`
- `tender`

Columnas principales:

- `template_item_catalog_id`: id estable
- `canonical_key`: clave canónica única
- `display_name`: nombre oficial legible
- `category`: categoría del cargo
- `profit_rule_key`: clave equivalente en `profit_rules_by_country.json` si existe
- `aliases`: labels alternativos detectados en templates
- `notes`: observaciones internas del mapeo

## `quote_template_items`

Ítems cotizables concretos dentro de un template.

Ejemplos:

- `Customs Clearance EZE airport`
- `Import taxes in Colombia`
- `Home delivery in Metro Mexico City`

Columnas principales:

- `template_item_id`: id estable del item
- `template_id`: FK a `quote_templates`
- `template_group_id`: FK a `quote_template_groups`
- `template_item_catalog_id`: FK opcional al catálogo canónico
- `item_number`: número visual del template
- `display_order`: orden dentro del template
- `item_name_raw`: label original
- `item_name_normalized`: label normalizado para matching
- `item_display_name`: label elegido para mostrar
- `price_amount`: monto
- `currency`: moneda
- `inline_note`: nota corta inline
- `is_optional`: si el item es condicional/opcional

## `quote_template_item_details`

Párrafos o detalles asociados a un item concreto.

Ejemplo:

- item: `Customs Clearance EZE airport`
- details:
  - `Includes our charges...`
  - `Service quoted from Monday to Friday...`

Columnas principales:

- `template_item_detail_id`: id estable
- `template_item_id`: FK a `quote_template_items`
- `template_id`: FK a `quote_templates`
- `detail_order`: orden
- `detail_text`: texto del detalle

## `quote_template_sections`

Bloques narrativos que no son ítems cotizables.

Ejemplos:

- `Important Notice`
- `Conditions of contract`
- `Comments`
- `Contact`

Columnas principales:

- `template_section_id`: id estable
- `template_id`: FK a `quote_templates`
- `template_group_id`: FK a `quote_template_groups`
- `section_type`: tipo del bloque (`note`, `description`, `condition`, `notice`, `comment`, `contact`)
- `title`: título del bloque
- `display_order`: orden dentro del template
- `content_json`: array de párrafos

## Criterio de uso

Usar `quote_template_groups` y `quote_templates` para encontrar el template correcto.

Usar `quote_template_items` para renderizar cargos o comparar precios.

Usar `quote_template_item_catalog` para unificar conceptos entre:

- templates IMPO
- `profit_rules_by_country.json`
- futuros catálogos operativos/comerciales

Usar `quote_template_sections` y `quote_template_item_details` para no perder texto legal, operativo o descriptivo.

## Siguiente paso sugerido

Cuando importemos datos:

1. crear grupos
2. crear templates
3. crear items
4. crear details y sections
5. empezar a poblar `quote_template_item_catalog` con mappings canónicos

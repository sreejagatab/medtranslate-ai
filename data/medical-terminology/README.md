# Medical Terminology Data for MedTranslate AI

This directory contains medical terminology data files used to populate the MedTranslate AI medical knowledge base.

## Data Sources

The medical terminology data comes from several authoritative sources:

1. **UMLS** (Unified Medical Language System): Comprehensive medical terminology across multiple languages
2. **MedlinePlus**: Consumer health information
3. **SNOMED CT**: Clinical terminology
4. **ICD10**: International Classification of Diseases - diagnostic codes
5. **RxNorm**: Normalized names for clinical drugs
6. **LOINC**: Logical Observation Identifiers Names and Codes - lab tests and observations

## File Format

The data files are in CSV format with the following columns:

- `term_id`: Unique identifier for the term
- `source_language`: Language code of the source term (e.g., "en")
- `target_language`: Language code of the target term (e.g., "es")
- `source_term`: The medical term in the source language
- `target_term`: The medical term in the target language
- `domain`: Medical domain/specialty (e.g., "cardiology", "neurology")
- `definition`: Brief definition of the term
- `source`: Data source name

## Medical Domains

The terminology is categorized into various medical domains, including:

- General
- Cardiology
- Neurology
- Oncology
- Pediatrics
- Psychiatry
- Radiology
- Emergency
- Surgery
- Obstetrics
- Gynecology
- Orthopedics
- Dermatology
- Ophthalmology
- Urology
- Endocrinology
- Gastroenterology
- Pulmonology
- Nephrology
- Hematology
- Immunology
- Infectious Disease
- Rheumatology
- Anesthesiology
- Pathology
- Pharmacy

## Usage

These data files are used by the `populate-medical-terminology-full.js` script to populate the DynamoDB table with medical terminology for accurate translation.

To populate the database with this terminology:

```bash
node scripts/populate-medical-terminology-full.js
```

You can also specify a specific source or domain:

```bash
node scripts/populate-medical-terminology-full.js --source=UMLS --domain=cardiology
```

## Sample Data

If the actual data files are not available, the script will generate sample data based on common medical terms in each domain. This sample data is useful for development and testing purposes.

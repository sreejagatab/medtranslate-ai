/**
 * MedicalTerminology Schema
 * 
 * This schema defines the structure of the medical terminology database
 * stored in DynamoDB. It includes comprehensive medical terms with
 * translations in multiple languages and specialized medical contexts.
 */

const MedicalTerminologySchema = {
  TableName: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
  KeySchema: [
    { AttributeName: 'term_source', KeyType: 'HASH' } // Partition key
  ],
  AttributeDefinitions: [
    { AttributeName: 'term_source', AttributeType: 'S' },
    { AttributeName: 'domain', AttributeType: 'S' },
    { AttributeName: 'language', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'DomainIndex',
      KeySchema: [
        { AttributeName: 'domain', KeyType: 'HASH' }
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'LanguageIndex',
      KeySchema: [
        { AttributeName: 'language', KeyType: 'HASH' }
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  BillingMode: 'PROVISIONED',
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  }
};

// Item structure for reference
const MedicalTerminologyItem = {
  term_source: 'myocardial infarction:en', // Primary key: term:language
  term: 'myocardial infarction',
  language: 'en',
  domain: 'cardiology',
  translations: [
    {
      language: 'es',
      term: 'infarto de miocardio',
      confidence: 'high',
      verified: true,
      last_verified: '2023-05-15T12:00:00Z'
    },
    {
      language: 'fr',
      term: 'infarctus du myocarde',
      confidence: 'high',
      verified: true,
      last_verified: '2023-05-15T12:00:00Z'
    }
  ],
  synonyms: ['heart attack', 'cardiac arrest', 'MI'],
  definition: 'Death of heart muscle due to lack of blood supply',
  context_examples: [
    'The patient was diagnosed with a myocardial infarction after experiencing chest pain.',
    'Myocardial infarction is a leading cause of death worldwide.'
  ],
  related_terms: ['angina', 'coronary artery disease', 'atherosclerosis'],
  medical_codes: {
    icd10: 'I21.9',
    snomed: '22298006',
    umls: 'C0027051'
  },
  data_source: 'UMLS',
  created_at: '2023-05-15T12:00:00Z',
  updated_at: '2023-05-15T12:00:00Z'
};

module.exports = {
  MedicalTerminologySchema,
  MedicalTerminologyItem
};

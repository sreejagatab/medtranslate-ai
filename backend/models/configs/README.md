# Model Configurations for MedTranslate AI

This directory contains configuration files for the language models used in MedTranslate AI.

## Configuration Files

- `models-config.json`: Combined configuration for all model families
- `claude-models.json`: Configuration for Claude models (Anthropic)
- `titan-models.json`: Configuration for Titan models (Amazon)
- `llama-models.json`: Configuration for Llama models (Meta)
- `mistral-models.json`: Configuration for Mistral models

## Configuration Structure

The combined configuration file (`models-config.json`) has the following structure:

```json
{
  "modelFamilies": ["claude", "titan", "llama", "mistral"],
  "models": {
    "claude": [
      "anthropic.claude-3-sonnet-20240229-v1:0",
      "anthropic.claude-3-haiku-20240307-v1:0",
      "anthropic.claude-instant-v1"
    ],
    "titan": [
      "amazon.titan-text-express-v1",
      "amazon.titan-text-lite-v1"
    ],
    "llama": [
      "meta.llama2-13b-chat-v1",
      "meta.llama2-70b-chat-v1"
    ],
    "mistral": [
      "mistral.mistral-7b-instruct-v0:2",
      "mistral.mixtral-8x7b-instruct-v0:1"
    ]
  },
  "medicalContexts": [
    "general",
    "cardiology",
    "neurology",
    "oncology",
    "pediatrics",
    "psychiatry",
    "radiology",
    "emergency",
    "surgery",
    "obstetrics",
    "gynecology",
    "orthopedics",
    "dermatology",
    "ophthalmology",
    "urology",
    "endocrinology",
    "gastroenterology",
    "pulmonology",
    "nephrology",
    "hematology",
    "immunology",
    "infectious_disease",
    "rheumatology",
    "anesthesiology",
    "pathology",
    "pharmacy"
  ],
  "languagePairs": [
    { "source": "en", "target": "es", "name": "English to Spanish" },
    { "source": "es", "target": "en", "name": "Spanish to English" },
    { "source": "en", "target": "fr", "name": "English to French" },
    { "source": "fr", "target": "en", "name": "French to English" },
    { "source": "en", "target": "de", "name": "English to German" },
    { "source": "de", "target": "en", "name": "German to English" },
    { "source": "en", "target": "zh", "name": "English to Chinese" },
    { "source": "zh", "target": "en", "name": "Chinese to English" },
    { "source": "en", "target": "ar", "name": "English to Arabic" },
    { "source": "ar", "target": "en", "name": "Arabic to English" },
    { "source": "en", "target": "ru", "name": "English to Russian" },
    { "source": "ru", "target": "en", "name": "Russian to English" },
    { "source": "en", "target": "pt", "name": "English to Portuguese" },
    { "source": "pt", "target": "en", "name": "Portuguese to English" },
    { "source": "en", "target": "ja", "name": "English to Japanese" },
    { "source": "ja", "target": "en", "name": "Japanese to English" },
    { "source": "en", "target": "it", "name": "English to Italian" },
    { "source": "it", "target": "en", "name": "Italian to English" }
  ],
  "defaultModel": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

Each model family configuration file (e.g., `claude-models.json`) has the following structure:

```json
{
  "family": "claude",
  "models": [
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-instant-v1"
  ],
  "capabilities": [
    "medical translation",
    "terminology verification",
    "context awareness"
  ],
  "recommendedFor": [
    "complex medical contexts",
    "high accuracy needs",
    "nuanced translations"
  ],
  "medicalContexts": ["general", "cardiology", "neurology", ...],
  "languagePairs": [
    { "source": "en", "target": "es", "name": "English to Spanish" },
    { "source": "es", "target": "en", "name": "Spanish to English" },
    ...
  ]
}
```

## Usage

These configuration files are used by the enhanced Bedrock client to select the appropriate model for medical translation based on the language pair, medical context, and other factors.

The configuration is loaded at runtime from the path specified in the `MODEL_CONFIG_PATH` environment variable.

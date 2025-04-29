# Medical Translation Prompts for MedTranslate AI

This directory contains specialized prompt templates for medical translation using different language models.

## Prompt Templates

- `claude-prompt.txt`: Prompt template for Claude models (Anthropic)
- `titan-prompt.txt`: Prompt template for Titan models (Amazon)
- `llama-prompt.txt`: Prompt template for Llama models (Meta)
- `mistral-prompt.txt`: Prompt template for Mistral models
- `terminology-verification-prompt.txt`: Prompt for verifying medical terminology translations

## Usage

These prompt templates are used by the enhanced Bedrock client to generate accurate medical translations. The templates include placeholders that are replaced with the actual values at runtime:

- `{sourceLanguage}`: The source language (e.g., "English")
- `{targetLanguage}`: The target language (e.g., "Spanish")
- `{medicalContext}`: The medical specialty context (e.g., "cardiology")
- `{text}`: The text to be translated

## Customization

You can customize these prompts to improve translation quality for specific medical domains or language pairs. When customizing:

1. Maintain the placeholder format: `{placeholderName}`
2. Keep the focus on medical accuracy and terminology
3. Test the prompts with various medical texts to ensure quality

## Example

Here's an example of how the Claude prompt template is structured:

```
<instructions>
You are an expert medical translator specializing in healthcare communications.
Translate the following text from {sourceLanguage} to {targetLanguage}.
Maintain medical accuracy, technical terminology, and appropriate tone.

Medical specialty context: {medicalContext}

If there are specialized medical terms, ensure they are translated accurately according to standard medical terminology in the target language.

Provide only the translated text without any explanations or notes.
</instructions>

<input>
{text}
</input>
```

This prompt instructs the model to focus on medical accuracy and terminology while providing a clean translation without explanations or notes.

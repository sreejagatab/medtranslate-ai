# Create infrastructure subdirectories
mkdir infrastructure\sagemaker
mkdir infrastructure\lambda
mkdir infrastructure\dynamodb
mkdir infrastructure\iot
mkdir infrastructure\networking

# Create backend subdirectories
mkdir backend\api
mkdir backend\lambda
mkdir backend\lambda\translation
mkdir backend\lambda\auth
mkdir backend\lambda\analytics
mkdir backend\models
mkdir backend\models\prompts
mkdir backend\models\fine-tuning
mkdir backend\models\validation
mkdir backend\database

# Create edge subdirectories
mkdir edge\runtime
mkdir edge\models
mkdir edge\cache
mkdir edge\sync

# Create frontend subdirectories
mkdir frontend\provider-app
mkdir frontend\provider-app\src
mkdir frontend\provider-app\assets
mkdir frontend\provider-app\tests
mkdir frontend\patient-app
mkdir frontend\patient-app\src
mkdir frontend\patient-app\assets
mkdir frontend\patient-app\tests
mkdir frontend\shared

# Create docs subdirectories
mkdir docs\architecture
mkdir docs\api
mkdir docs\deployment
mkdir docs\user-guides

# Create tests subdirectories
mkdir tests\unit
mkdir tests\integration
mkdir tests\performance

Write-Host "Directory structure created successfully!"

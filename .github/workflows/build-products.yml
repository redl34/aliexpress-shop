name: Зібрати дані про товари

# Запускати при пушах в main/master та при зміні HTML-файлів
on:
  push:
    branches: [ main, master ]
    paths:
      - '*.html'
  # Можна також запускати вручну
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Клонувати репозиторій
      uses: actions/checkout@v3
      
    - name: Встановити Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Запустити скрипт збору даних
      run: node scripts/build-products.js
      
    - name: Перевірити зміни
      run: |
        git status
        if [ -n "$(git status --porcelain)" ]; then
          echo "ЗМІНИ_Є=true" >> $GITHUB_ENV
        else
          echo "ЗМІНИ_Є=false" >> $GITHUB_ENV
        fi
      
    - name: Зберегти зміни
      if: env.ЗМІНИ_Є == 'true'
      run: |
        git config --global user.name 'GitHub Action'
        git config --global user.email 'action@github.com'
        git add products.json
        git commit -m "Автоматичне оновлення products.json"
        git push

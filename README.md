# Конвертер валют — frontend (хакатон Яндекс.Практикум)

> Команда 2 · декабрь 2024.  
> Красиво показать «сколько это в рублях», пока бэкенд спорит с чужим currency API.

---

## Ссылки

- **Сайт:** [currency-converter-team2.vercel.app](https://currency-converter-team2.vercel.app/)  
- **Backend:** [currency-converter-backend](https://github.com/r0meo-1/currency-converter-backend)  
- **Figma:** [макет](https://www.figma.com/design/PHxF5BGFK2kv0NvCDQu1xE/)  

---

## Стек

HTML5 · JavaScript ES6 · Sass/SCSS  

Без «давайте на React, потому что в вакансии написано React» — хакатон любит скорость.

---

## Запуск

```bash
git clone https://github.com/r0meo-1/currency-converter-frontend.git
cd currency-converter-frontend
npm ci
npm run dev
```

По умолчанию используется `https://currency-converter.hopto.org/api/convert/`.
Для другого сервера задайте полный URL endpoint в `.env.local`, например:

```dotenv
VITE_API_URL=http://localhost:8000/api/convert/
```

Это публичный адрес, включаемый в сборку. Не добавляйте сюда ключ API.
Backend должен разрешать CORS для адреса frontend. После изменения переменной
перезапустите dev-сервер или пересоберите приложение.

`npm test` собирает production bundle и проверяет его в jsdom: быстрый ввод,
ответы в обратном порядке, очистку полей, смену валют, обратный расчёт и ошибки.
Запросы заменены управляемыми ответами, внешний сервер не нужен.
`npm run build` создаёт сборку в `dist`, `npm run preview` открывает её локально.

---

## Контакты

**[r0meo1.ru](https://r0meo1.ru)** · [@r0meo1](https://t.me/r0meo1)

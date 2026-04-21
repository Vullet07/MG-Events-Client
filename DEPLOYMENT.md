# MG Events Deployment Checklist

Този файл е кратка production рамка за MG Events: React frontend, ASP.NET Core WebAPI backend и SQL Server база.

## 1. Среда

- Frontend: Node.js LTS, `npm ci`, `npm run build`.
- Backend: .NET 9 SDK/Runtime, `dotnet publish`.
- Database: SQL Server с отделна production база.
- Uploads: постоянна директория за `wwwroot/uploads`, която не се трие при redeploy.

## 2. Frontend

1. Създай production env файл по модела на `.env.production.example`.
2. Задай `VITE_API_BASE_URL` към публичния API адрес, например:
   `https://your-api-domain.example/api`
3. Build:
   ```powershell
   npm ci
   npm run build
   ```
4. Deploy-ва се съдържанието на `dist/` към static hosting, IIS, Nginx или друг reverse proxy.

## 3. Backend

1. Използвай `WebAPI/appsettings.Production.example.json` като шаблон.
2. Production стойностите трябва да идват от environment variables или secret manager:
   - `ConnectionStrings__DefaultConnection`
   - `Jwt__Key`
   - `Jwt__Issuer`
   - `Jwt__Audience`
   - `Frontend__BaseUrl`
   - `Cors__AllowedOrigins__0`
   - `Smtp__Username`
   - `Smtp__Password`
3. Publish:
   ```powershell
   dotnet publish WebAPI\WebAPI.csproj -c Release -o publish
   ```
4. Database migration:
   ```powershell
   dotnet ef database update --project Data\Data.csproj --startup-project WebAPI\WebAPI.csproj
   ```

## 4. Seed

- По подразбиране seed не трябва да чисти production база при restart.
- За demo/reseed среда използвай само изрично:
  ```powershell
  $env:MG_EVENTS_FORCE_RESEED="1"
  dotnet run --project WebAPI\WebAPI.csproj
  ```
- След reseed махни `MG_EVENTS_FORCE_RESEED`, за да не се презапише базата при следващ старт.

## 5. Security

- Не commit-вай реални SMTP пароли, JWT ключове и connection strings.
- JWT ключът трябва да е дълъг и случаен.
- CORS трябва да допуска само реалния frontend домейн.
- Rate limiting вече е активен глобално за всички HTTP заявки.
- Upload директорията трябва да е защитена от изпълнение на скриптове.

## 6. Final Smoke Test

- Login с `admin@schoolmath.eu` или `admin`.
- Създаване на тема.
- Създаване на пин на кампуса и на етаж.
- Потвърждение на решен пин от трима различни потребители.
- Word export на месечната статистика.
- Регистрация с `@schoolmath.eu` и email confirmation link.

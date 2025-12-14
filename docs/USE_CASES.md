# 📊 Diagrama de Casos de Uso - Orbit CRM

Este diagrama mapeia as interações de alto nível dos atores com o sistema.

```mermaid
usecaseDiagram
    actor "Administrador" as Admin
    actor "Gerente de Vendas" as Manager
    actor "Vendedor" as Seller

    package "Orbit CRM Core" {
        usecase "Gerenciar Times" as UC1
        usecase "Visualizar Dashboard Global" as UC2
        usecase "Gerenciar Próprios Contatos" as UC3
        usecase "Mover Cards no Pipeline" as UC4
        usecase "Visualizar Pipeline da Equipe" as UC5
        usecase "Convidar Membros" as UC6
        usecase "Upload de Contratos" as UC7
    }

    Admin --> UC1
    Admin --> UC2

    Manager --> UC5
    Manager --> UC6
    Manager --> UC2

    Seller --> UC3
    Seller --> UC4
    Seller --> UC7

    Manager --|> Seller : "Herda permissões"
```

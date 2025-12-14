<div align="center">

<!-- PROJECT_TITLE_START -->

# 🚧 Orbit CRM

**Plataforma de Gestão de Relacionamento com Arquitetura de Microsserviços e Segurança Ofensiva**
_(Em Desenvolvimento Ativo)_

<!-- PROJECT_TITLE_END -->
<!-- PROJECT_TITLE_END -->

<!-- PROJECT_TAG_START -->

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)

<!-- PROJECT_TAG_END -->

<!-- PROJECT_DEMO_START -->

https://github.com/luiznascimentodev/mvp-crm

<!-- PROJECT_DEMO_END -->

</div>

---

## 🌟 Visão Geral do Projeto

Orbit CRM
Este projeto, atualmente em fase de desenvolvimento acelerado, visa estabelecer um novo padrão para aplicações corporativas no meu portfólio. Trata-se de um CRM (Customer Relationship Management) "Full-Cycle" projetado para simular cenários reais de alta complexidade, incluindo colaboração em tempo real via WebSockets, processamento assíncrono de tarefas pesadas e uma arquitetura orientada a eventos. O foco principal não é apenas a funcionalidade, mas a excelência na engenharia: TDD (Test Driven Development) estrito, segurança ofensiva (OWASP Top 10) e orquestração de infraestrutura com Kubernetes.

<!-- PROJECT_HIGHLIGHTS_START -->

- 🚧 **Status**: Em construção (Fase: Arquitetura & Setup)
- ✅ **Security First**: Auditoria de logs, RBAC granular e proteção contra injeção
- ✅ **Performance**: Arquitetura híbrida (Síncrona para API / Assíncrona para Jobs)
- ✅ **Escalabilidade**: Preparado para Kubernetes com separação de ambientes
- ✅ **UX Moderna**: Navegação "Keyboard-first" (Command Palette) e Optimistic UI
<!-- PROJECT_HIGHLIGHTS_END -->

## ✨ Funcionalidades Planejadas

O sistema está sendo construído módulo a módulo, seguindo uma estratégia de "Vertical Slices":

- **Pipeline de Vendas Real-Time**: Kanban colaborativo onde as movimentações são sincronizadas via WebSockets entre todos os membros da equipe instantaneamente.
- **Gestão de Acesso (RBAC)**: Hierarquia estrita onde Gerentes possuem visão analítica global e Vendedores possuem acesso isolado (Multi-tenancy lógico).
- **Auditoria Total (Audit Logs)**: Rastreabilidade imutável de "Quem, Quando e Onde" para qualquer alteração crítica de dados.
- **Processamento Assíncrono**: Sistema de filas (BullMQ + Redis) para envio de emails e geração de relatórios sem bloquear a API.
- **Gestão de Arquivos**: Upload seguro de contratos e propostas diretamente para Object Storage (S3/MinIO) via Presigned URLs.
- **Dashboard Estratégico**: Métricas de conversão e receita calculadas com agregações de alta performance no banco de dados.

---

## 🛠️ Stack Tecnológica

A escolha das tecnologias reflete o "Estado da Arte" do desenvolvimento web em 2025:

<!-- PROJECT_TECH_START -->

### Backend (API & Workers)

- **Runtime**: Node.js v24 (LTS)
- **Framework**: Fastify v5 (Foco em baixa latência)
- **Linguagem**: TypeScript v5.9 (Strict Mode)
- **Database**: PostgreSQL 17 + Prisma ORM v6
- **Async/Queues**: BullMQ + Redis 7
- **Real-time**: Socket.io com autenticação JWT
- **Testes**: Vitest (Unitários e Integração)

### Frontend (SPA)

- **Core**: React 19 + Vite
- **Estilização**: Tailwind CSS v4 + Shadcn/UI
- **State Management**: TanStack Query + Zustand
- **UX**: cmdk (Command Palette), Sonner (Toasts), Dnd-kit (Kanban)

### Infraestrutura & DevOps

- **Containerização**: Docker & Docker Compose (Multi-stage builds)
- **Orquestração**: Kubernetes v1.31+ (Namespaces para Staging/Prod)
- **CI/CD**: GitHub Actions (Lint, Test, Security Scan, Build)
- **Storage**: MinIO (Local) / AWS S3 (Prod)
<!-- PROJECT_TECH_END -->

---

## 📁 Estrutura do Monorepo

O projeto segue uma estrutura escalável de monorepo para facilitar a gestão de microsserviços e frontend:

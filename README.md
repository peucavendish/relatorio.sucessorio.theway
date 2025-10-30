# TW Relatório - Sistema de Planejamento Patrimonial

Sistema web para geração de relatórios financeiros personalizados de planejamento patrimonial, desenvolvido para assessores financeiros apresentarem análises detalhadas aos seus clientes.

## 📋 Sobre o Projeto

O TW Relatório é uma aplicação React que permite criar e visualizar relatórios financeiros completos, incluindo análises de aposentadoria, planejamento tributário, proteção patrimonial, sucessão e muito mais. O sistema oferece controle granular sobre a visibilidade de seções e componentes, permitindo personalização completa dos relatórios.

## ✨ Funcionalidades Principais

### 📊 Seções do Relatório

- **Capa Personalizada** - Informações do cliente e resumo executivo
- **Resumo Financeiro** - Visão geral da situação financeira
- **Alocação Total de Ativos** - Distribuição de patrimônio
- **Planejamento de Aposentadoria** - Projeções e simulações de aposentadoria
- **Aquisição de Imóveis** - Análise de financiamento e viabilidade
- **Planejamento Tributário** - Estratégias de otimização fiscal
- **Proteção Patrimonial** - Análise de seguros e proteção
- **Planejamento Sucessório** - Transferência de patrimônio
- **Indicador de Segurança Financeira** - Métricas de saúde financeira
- **Projetos de Vida** - Planejamento de objetivos pessoais
- **Plano de Ação** - Ações prioritárias e cronograma
- **Monitoramento de Implementação** - Acompanhamento de metas

### 🎛️ Recursos de Personalização

- **Controle de Visibilidade de Seções** - Oculte ou exiba seções completas do relatório
- **Controle de Visibilidade de Cards** - Gerencie a visibilidade individual de componentes
- **Modo Resumo** - Visualização compacta para apresentações rápidas
- **Tema Claro/Escuro** - Suporte a múltiplos temas visuais
- **Exportação/Impressão** - Gere PDFs e imprima relatórios

### 📈 Visualizações e Gráficos

- Gráficos de projeção de aposentadoria
- Simulador de financiamento
- Gráficos de alocação de ativos (Donut Chart)
- Projeções de fluxo de caixa
- Indicadores de segurança financeira

### 🔐 Segurança e Acesso

- Autenticação de usuários
- Rotas protegidas
- Modo assessor vs. modo cliente
- Controle de acesso baseado em permissões

## 🛠️ Tecnologias Utilizadas

### Core
- **React 18** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset tipado do JavaScript
- **Vite** - Build tool e dev server rápido

### UI/UX
- **shadcn/ui** - Componentes UI acessíveis e customizáveis
- **Radix UI** - Primitivos UI sem estilos
- **Tailwind CSS** - Framework CSS utility-first
- **Lucide React** - Biblioteca de ícones
- **Recharts** - Biblioteca de gráficos para React

### Estado e Dados
- **React Router DOM** - Roteamento para React
- **TanStack Query** - Gerenciamento de estado do servidor
- **Axios** - Cliente HTTP

### Funcionalidades Adicionais
- **html2canvas** - Exportação de componentes para imagem
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **date-fns** - Manipulação de datas

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+ (recomendado usar [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <YOUR_GIT_URL>

# Entre no diretório do projeto
cd TW_Relatorio

# Instale as dependências
npm install
```

### Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build

```bash
# Build para produção
npm run build

# Build em modo desenvolvimento
npm run build:dev

# Preview do build de produção
npm run preview
```

### Linting

```bash
# Execute o linter
npm run lint
```

## 📁 Estrutura do Projeto

```
TW_Relatorio/
├── src/
│   ├── components/
│   │   ├── charts/           # Componentes de gráficos
│   │   ├── layout/           # Componentes de layout (Header, Navigation, etc.)
│   │   ├── sections/         # Seções do relatório
│   │   └── ui/               # Componentes UI reutilizáveis
│   ├── context/              # Contextos React (Theme, Auth, Visibility)
│   ├── hooks/                # Custom hooks
│   ├── pages/                # Páginas da aplicação
│   ├── services/             # Serviços de API
│   ├── utils/                # Utilitários
│   └── styles/               # Estilos globais
├── public/                   # Arquivos estáticos
└── dist/                     # Build de produção
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_API_URL=https://api.example.com
```

### API Endpoints Esperados

O sistema espera os seguintes endpoints da API:

- `GET /clients/eventos-liquidez` - Lista eventos de liquidez
- `POST /clients/eventos-liquidez` - Salva eventos de liquidez
- `GET /clients/hidden-sections` - Obtém seções ocultas
- `POST /clients/update-hidden-sections` - Atualiza seções ocultas
- Outros endpoints conforme necessário

## 📖 Documentação Adicional

- [Controle de Visibilidade de Seções](./SECAO_VISIBILIDADE.md) - Documentação detalhada sobre o sistema de visibilidade

## 🎨 Personalização

### Temas

O sistema suporta temas claro e escuro através do `ThemeContext`. Os temas são gerenciados usando `next-themes` e Tailwind CSS.

### Componentes UI

Os componentes UI são baseados em shadcn/ui e podem ser customizados através do arquivo `tailwind.config.ts` e das classes Tailwind.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria o build de produção
- `npm run build:dev` - Cria o build em modo desenvolvimento
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter ESLint

## 🔄 Versionamento

O projeto utiliza versionamento semântico. Para mais informações sobre versões disponíveis, consulte as [tags deste repositório](https://github.com/seu-usuario/TW_Relatorio/tags).

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Equipe

Desenvolvido para Alta Vista - The Way

## 📞 Suporte

Para suporte, entre em contato através dos canais oficiais da empresa.

---

**Última atualização**: 2024

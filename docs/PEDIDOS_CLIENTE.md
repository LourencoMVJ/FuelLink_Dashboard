# Pedidos do Cliente — Registo

> Regista pedidos de funcionalidade feitos pelo cliente fora do ciclo normal
> de planeamento (WhatsApp, email, chamada), com a análise técnica feita na
> altura e o estado de âmbito decidido. Serve para não perder pedidos soltos
> e para ter o rasto por escrito exigido pela **Cláusula 1.4** do contrato
> (pedidos de reordenação de módulos ou âmbito adicional exigem avaliação
> escrita do Developer em 5 dias úteis; reordenar módulos ainda não
> iniciados é grátis, âmbito novo ou retrabalho de módulos já aceites é
> orçamentado à parte). Entradas por ordem cronológica, mais recente no
> topo.

---

## 19/08/2026 — Malcolm Kapondera (COO, Fuellink)

**Fonte**: WhatsApp, 18/08/2026, 21:47-21:52.

> "I want the dashboard to be able to tell me how many litres of diesel we
> have put on specific day for example how many litres we sold today."
>
> "I need the dashboard to be able to do a reconciliation of all litres
> sold and and transportation"
>
> "I need it to be able to download excel or pdf statement"

**Análise técnica**:

1. **Litros vendidos "hoje"** — pequena extensão à Zona 2 do Dashboard já
   fechada em [ESPECIFICACAO_FASE1_FRONTEND.md](ESPECIFICACAO_FASE1_FRONTEND.md)
   Secção 4: um KPI fixo "Litros vendidos hoje", independente do filtro de
   período da Zona 1 (que hoje obriga a mudar o filtro todas as manhãs para
   ver o mesmo número). Baixo custo, mesmo ecrã, mesmos dados já
   disponíveis.
2. **Reconciliação de litros vendidos (Fuellink) vs. transportados
   (Bankers)** — é uma comparação cruzada entre empresas, exactamente o
   tipo de conteúdo já reservado para a **Zona 2b** do Dashboard (gated por
   `ledger.view`), que até agora só continha o Net Position financeiro.
   Passa a ter também um widget de reconciliação de litros. Não precisa de
   ecrã novo — cabe na estrutura já desenhada.
3. **Download de statement em Excel/PDF** — sem correspondência no que já
   foi speccado; trabalho novo. Em aberto: o que é exactamente o
   "statement" (o próprio Dashboard/reconciliação? a lista de Operações? o
   histórico completo do ledger?). PDF formatado a sério (não
   print-to-PDF do browser) usa a mesma máquina técnica já reservada para o
   Mês 5 (`dompdf`/`tcpdf`, self-hosted no cPanel, Cláusula 6.2). Export
   Excel é mais leve — pode ser feito no cliente, sem PHP.

**Estado de âmbito (decidido 19/08/2026)**: **nenhum dos 3 entra na Fase 1
actual** (Login, Dashboard, Operações, Detalhe — já fechada e escrita em
[ESPECIFICACAO_FASE1_FRONTEND.md](ESPECIFICACAO_FASE1_FRONTEND.md)). Ficam
registados aqui como pedidos pendentes de âmbito, potencialmente sujeitos à
Cláusula 1.4 — orçamento/calendarização por definir numa próxima ronda,
antes de qualquer um entrar em desenvolvimento.

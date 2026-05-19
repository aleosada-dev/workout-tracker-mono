# Relatório de Lints Supabase - Plano de Ação

**Data:** 2026-04-09

## Resumo Geral

| Categoria | Nível | Tipo de Lint | Ocorrências |
|-----------|-------|-------------|-------------|
| PERFORMANCE | WARN | Auth RLS InitPlan | 12 policies |
| PERFORMANCE | WARN | Multiple Permissive Policies | ~50 entradas (15 tabelas) |
| PERFORMANCE | INFO | Unindexed Foreign Keys | 13 FKs |
| PERFORMANCE | INFO | Unused Indexes | ~55 índices |
| SECURITY | WARN | Function Search Path Mutable | 7 funções |
| SECURITY | INFO | RLS Enabled No Policy | 2 tabelas |

---

## 1. Auth RLS InitPlan (WARN - PERFORMANCE)

**Prioridade: Alta**

**Problema:** Policies RLS usando `auth.uid()` diretamente ao invés de `(SELECT auth.uid())`, causando re-avaliação por linha. Isso degrada performance significativamente em tabelas com muitas linhas.

**Tabelas afetadas (3):**

| Tabela | Policies afetadas |
|--------|-------------------|
| `workout_logs` | Athletes insert own logs, Athletes read own logs, Coaches read athlete logs, Coaches insert athlete logs |
| `workout_exercise_logs` | Athletes read own exercise logs, Athletes insert own exercise logs, Coaches read athlete exercise logs, Coaches insert athlete exercise logs |
| `workout_exercise_set_logs` | Athletes read own set logs, Athletes insert own set logs, Coaches read athlete set logs, Coaches insert athlete set logs |

**Correção:** Trocar `auth.uid()` por `(SELECT auth.uid())` em cada policy.

```sql
-- De:
CREATE POLICY "Athletes insert own logs" ON workout_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Para:
CREATE POLICY "Athletes insert own logs" ON workout_logs
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
```

**Impacto:** Alto — essas são as tabelas mais consultadas do app (logs de treino). A correção melhora performance significativamente em escala.

---

## 2. Function Search Path Mutable (WARN - SECURITY)

**Prioridade: Alta**

**Problema:** Funções sem `search_path` fixo permitem ataques de search path poisoning. Um usuário malicioso poderia criar objetos em schemas que precedem `public` no search_path.

**Funções afetadas (7):**

1. `update_subscriptions_updated_at`
2. `guard_workout_log_soft_delete`
3. `search_coaches_by_service_area`
4. `search_coaches_by_gym_location`
5. `validate_variation_muscle_level`
6. `get_coach_occupied_slots`
7. `validate_muscle_hierarchy`

**Correção:** Adicionar `SET search_path = ''` a cada função e qualificar referências a objetos com o schema.

```sql
ALTER FUNCTION public.update_subscriptions_updated_at SET search_path = '';
ALTER FUNCTION public.guard_workout_log_soft_delete SET search_path = '';
ALTER FUNCTION public.search_coaches_by_service_area SET search_path = '';
ALTER FUNCTION public.search_coaches_by_gym_location SET search_path = '';
ALTER FUNCTION public.validate_variation_muscle_level SET search_path = '';
ALTER FUNCTION public.get_coach_occupied_slots SET search_path = '';
ALTER FUNCTION public.validate_muscle_hierarchy SET search_path = '';
```

> **Atenção:** Ao definir `search_path = ''`, todas as referências a tabelas/funções dentro do body da função precisam estar qualificadas com o schema (ex: `public.workout_logs` ao invés de `workout_logs`). Verifique o body de cada função antes de aplicar.

---

## 3. Multiple Permissive Policies (WARN - PERFORMANCE)

**Prioridade: Média**

**Problema:** Múltiplas policies permissivas para o mesmo role/action forçam o Postgres a avaliar cada uma individualmente. Combinar em uma única policy com OR é mais eficiente.

**Tabelas afetadas (15 tabelas únicas):**

### Workout Logs

| Tabela | Role | Actions |
|--------|------|---------|
| `workout_logs` | authenticated | SELECT, INSERT |
| `workout_exercise_logs` | authenticated | SELECT, INSERT |
| `workout_exercise_set_logs` | authenticated | SELECT, INSERT |
| `workout_log_summaries` | authenticated | SELECT, INSERT |

### Preparatory

| Tabela | Role | Actions |
|--------|------|---------|
| `workout_preparatory_exercises` | authenticated | SELECT, INSERT, UPDATE, DELETE |
| `workout_preparatory_exercise_logs` | authenticated | SELECT, INSERT, UPDATE, DELETE |
| `workout_preparatory_sets` | authenticated | SELECT, INSERT, UPDATE, DELETE |
| `workout_preparatory_set_logs` | authenticated | SELECT, INSERT, UPDATE, DELETE |

### Coach Scheduling

| Tabela | Role | Actions |
|--------|------|---------|
| `coach_availability` | authenticated | SELECT |
| `coach_availability_overrides` | authenticated | SELECT |
| `coach_recurring_schedules` | authenticated | SELECT |
| `coach_recurring_schedule_exceptions` | authenticated | SELECT, INSERT |
| `coach_sessions` | authenticated | SELECT, INSERT, UPDATE, DELETE |

### Coach Profile

| Tabela | Role | Actions |
|--------|------|---------|
| `coach_gym_schedules` | authenticated | SELECT |
| `coach_gyms` | authenticated | SELECT |
| `coach_service_area_schedules` | authenticated | SELECT |
| `coach_service_areas` | authenticated | SELECT |
| `coach_service_types` | authenticated | SELECT |
| `coach_testimonials` | authenticated | UPDATE |

### Payments

| Tabela | Role | Actions |
|--------|------|---------|
| `payment_sessions` | authenticated | SELECT |
| `payments` | authenticated | SELECT |
| `subscriptions` | authenticated | SELECT |

### Records

| Tabela | Role | Actions |
|--------|------|---------|
| `workout_variation_records` | authenticated | SELECT, INSERT |

**Correção:** Combinar policies de "Athletes" e "Coaches" em uma única policy com lógica OR.

```sql
-- De: 2 policies separadas
-- "Athletes read own logs": user_id = (SELECT auth.uid())
-- "Coaches read athlete logs": EXISTS(SELECT 1 FROM coach_athletes ...)

-- Para: 1 policy combinada
CREATE POLICY "Users read logs" ON workout_logs FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM coach_athletes WHERE ...)
  );
```

> **Nota:** As entradas para roles `anon`, `authenticator`, `dashboard_user` são ruído gerado pelo linter — provavelmente são policies herdadas. Foque nas policies para `authenticated`.

---

## 4. Unindexed Foreign Keys (INFO - PERFORMANCE)

**Prioridade: Média**

**Problema:** Foreign keys sem índice de cobertura podem causar table scans em JOINs e em cascading DELETEs.

| Tabela | FK | Prioridade sugerida |
|--------|----|---------------------|
| `coach_athletes` | `invited_by_fkey` | Baixa |
| `coach_session_disputes` | `author_id_fkey` | Baixa |
| `coach_sessions` | `approved_by_fkey` | Baixa |
| `coach_sessions` | `canceled_by_fkey` | Baixa |
| `coach_sessions` | `requested_by_fkey` | Média |
| `coach_testimonials` | `athlete_id_fkey` | Baixa |
| `muscles` | `parent_id_fkey` | Baixa (tabela pequena) |
| `notifications` | `sender_user_id_fkey` | Média |
| `plan_feature_limits` | `feature_key_fk` | Baixa (tabela pequena) |
| `report_favorites` | `target_user_id_fkey` | Baixa |
| `subscription_feature_overrides` | `feature_key_fk` | Baixa (tabela pequena) |
| `workout_logs` | `deleted_by_fkey` | Baixa |
| `workout_sets` | `linked_set_id_fkey` | Média |

**Correção:** Criar índices apenas para FKs que participam de JOINs ou DELETEs em cascata frequentes.

```sql
-- Exemplo para as de prioridade média:
CREATE INDEX CONCURRENTLY idx_coach_sessions_requested_by ON public.coach_sessions (requested_by);
CREATE INDEX CONCURRENTLY idx_notifications_sender_user_id ON public.notifications (sender_user_id);
CREATE INDEX CONCURRENTLY idx_workout_sets_linked_set_id ON public.workout_sets (linked_set_id);
```

---

## 5. Unused Indexes (INFO - PERFORMANCE)

**Prioridade: Baixa**

**Problema:** ~55 índices que nunca foram utilizados segundo as estatísticas do Postgres. Eles consomem espaço e degradam performance de escrita (INSERT/UPDATE/DELETE).

**Índices por tabela:**

| Tabela | Índices não utilizados |
|--------|----------------------|
| `workouts` | `workouts_archived_at_idx`, `workouts_created_by_idx`, `workouts_updated_by_idx` |
| `workout_sets` | `workout_sets_exercise_id_idx` |
| `workout_exercises` | `workout_exercises_workout_id_idx`, `workout_exercises_variation_id_idx` |
| `workout_logs` | `workout_logs_user_id_idx`, `workout_logs_started_by_idx`, `idx_workout_logs_coach_session_id` |
| `workout_log_summaries` | `workout_log_summaries_user_id_idx` |
| `workout_exercise_logs` | `workout_exercise_logs_variation_id_idx` |
| `workout_variation_records` | `workout_variation_records_user_id_idx`, `workout_variation_records_variation_id_idx` |
| `workout_preparatory_exercises` | `workout_preparatory_exercises_workout_id_idx`, `workout_preparatory_exercises_variation_id_idx` |
| `workout_preparatory_sets` | `workout_preparatory_sets_exercise_id_idx` |
| `workout_preparatory_exercise_logs` | `workout_preparatory_exercise_logs_log_id_idx`, `workout_preparatory_exercise_logs_variation_id_idx` |
| `workout_preparatory_set_logs` | `workout_preparatory_set_logs_exercise_log_id_idx` |
| `variations` | `variations_user_id_idx`, `variations_created_by_idx`, `variations_updated_by_idx`, `variations_equipment_id_idx`, `idx_variations_secondary_muscle_id` |
| `exercises` | `exercises_user_id_idx`, `exercises_created_by_idx`, `exercises_updated_by_idx` |
| `shared_variations` | `idx_shared_variations_shared_with_id`, `idx_shared_variations_owner_id` |
| `coach_athletes` | `coach_athletes_coach_id_idx`, `coach_athletes_athlete_id_idx` |
| `coach_sessions` | `idx_coach_sessions_coach_id`, `idx_coach_sessions_athlete_id`, `idx_coach_sessions_status`, `idx_coach_sessions_workout_log_id` |
| `coach_session_disputes` | `idx_coach_session_disputes_session_id` |
| `coach_recurring_schedules` | `idx_coach_recurring_schedules_athlete_id` |
| `coach_recurring_schedule_exceptions` | `idx_recurring_exceptions_schedule_id` |
| `coach_gyms` | `idx_coach_gyms_coach_id`, `idx_coach_gyms_location` |
| `coach_gym_schedules` | `idx_coach_gym_schedules_gym_id` |
| `coach_service_areas` | `idx_coach_service_areas_coach_id`, `idx_coach_service_areas_center` |
| `coach_service_area_schedules` | `idx_coach_service_area_schedules_area_id` |
| `coach_testimonials` | `coach_testimonials_coach_id_idx` |
| `subscriptions` | `subscriptions_plan_id_idx`, `subscriptions_granted_by_idx`, `subscriptions_stripe_subscription_id_idx` |
| `payments` | `idx_payments_coach_id`, `idx_payments_paid_at` |
| `payment_sessions` | `idx_payment_sessions_payment_id`, `idx_payment_sessions_session_id` |
| `push_subscriptions` | `idx_push_subscriptions_user_id` |
| `notifications` | `notifications_recipient_created_at_idx` |
| `report_favorites` | `report_favorites_user_id_created_at_idx` |

> **Cuidado:** Estatísticas de uso de índice resetam a cada restart do Postgres. Confirme que o banco tem histórico de uso real antes de remover. Algumas features (coach, payments) podem não estar em uso ativo ainda, e os índices serão necessários quando estiverem.

---

## 6. RLS Enabled No Policy (INFO - SECURITY)

**Prioridade: Baixa**

**Tabelas:**
- `stripe_events` — RLS ativo, sem policies
- `stripe_price_map` — RLS ativo, sem policies

**Análise:** Provavelmente intencional. Essas tabelas devem ser acessadas apenas via `service_role` (webhooks Stripe, Edge Functions). RLS sem policies bloqueia acesso para qualquer outro role, o que é o comportamento desejado.

**Ação:** Verificar se realmente são acessadas apenas via `service_role`. Se sim, nenhuma ação necessária. Se não, criar policies adequadas.

---

## Ordem de Execução Sugerida

| Fase | Ação | Esforço | Impacto |
|------|-------|---------|---------|
| **1** | Fix `auth_rls_initplan` — trocar `auth.uid()` por `(SELECT auth.uid())` | Baixo | Alto |
| **2** | Fix `function_search_path_mutable` — adicionar `SET search_path` | Baixo | Segurança |
| **3** | Combinar multiple permissive policies (começar pelas tabelas de workout logs) | Médio | Médio |
| **4** | Criar índices para FKs com maior uso | Baixo | Médio |
| **5** | Investigar/remover índices não utilizados | Baixo | Baixo |
| **6** | Verificar tabelas Stripe sem policies | Baixo | Informacional |

As fases 1 e 2 podem ser feitas numa única migration. A fase 3 é a mais trabalhosa pois requer reescrever policies e precisa de testes cuidadosos para não quebrar permissões.

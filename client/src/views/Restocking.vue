<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div class="card budget-card">
      <div class="budget-header">
        <div>
          <div class="budget-label">{{ t('restocking.availableBudget') }}</div>
          <div class="budget-value">{{ currencySymbol }}{{ budget.toLocaleString() }}</div>
        </div>
        <div class="budget-meta">
          <div class="meta-row"><span>{{ t('restocking.recommendedSpend') }}</span><strong>{{ currencySymbol }}{{ totalRecommended.toLocaleString() }}</strong></div>
          <div class="meta-row"><span>{{ t('restocking.remaining') }}</span><strong>{{ currencySymbol }}{{ (budget - totalRecommended).toLocaleString() }}</strong></div>
        </div>
      </div>
      <input type="range" class="budget-slider" :min="5000" :max="250000" :step="1000" v-model.number="budget" />
      <div class="slider-marks">
        <span>{{ currencySymbol }}5K</span><span>{{ currencySymbol }}50K</span><span>{{ currencySymbol }}100K</span><span>{{ currencySymbol }}150K</span><span>{{ currencySymbol }}200K</span><span>{{ currencySymbol }}250K</span>
      </div>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="card">
      <div class="card-header">
        <h3 class="card-title">{{ t('restocking.recommendedItems') }} ({{ recommendations.length }})</h3>
        <button class="btn-primary" :disabled="recommendations.length === 0 || submitting" @click="placeOrder">
          {{ submitting ? t('restocking.submitting') : t('restocking.placeOrder') }}
        </button>
      </div>
      <div v-if="recommendations.length === 0" class="empty-state">
        {{ t('restocking.emptyState') }}
      </div>
      <div v-else class="table-container">
        <table class="restock-table">
          <thead>
            <tr>
              <th>{{ t('restocking.table.sku') }}</th>
              <th>{{ t('restocking.table.item') }}</th>
              <th>{{ t('restocking.table.trend') }}</th>
              <th>{{ t('restocking.table.forecastDemand') }}</th>
              <th>{{ t('restocking.table.qty') }}</th>
              <th>{{ t('restocking.table.unitCost') }}</th>
              <th>{{ t('restocking.table.lineTotal') }}</th>
              <th>{{ t('restocking.table.leadTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in recommendations" :key="item.sku">
              <td><code>{{ item.sku }}</code></td>
              <td>{{ item.name }}</td>
              <td><span :class="['trend', item.trend]">{{ t('trends.' + item.trend) }}</span></td>
              <td>{{ item.forecasted_demand }}</td>
              <td>{{ item.recommended_qty }}</td>
              <td>{{ currencySymbol }}{{ item.unit_cost.toFixed(2) }}</td>
              <td><strong>{{ currencySymbol }}{{ item.line_total.toLocaleString() }}</strong></td>
              <td>{{ item.lead_time_days }} {{ t('restocking.days') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="lastOrder" class="card success-card">
      <div class="success-header">
        <strong>{{ t('restocking.orderSubmitted', { orderNumber: lastOrder.order_number }) }}</strong>
        <span>{{ t('restocking.expectedIn', { amount: currencySymbol + lastOrder.total_value.toLocaleString(), days: lastOrder.lead_time_days }) }}</span>
      </div>
      <router-link to="/orders" class="link">{{ t('restocking.viewInOrders') }} →</router-link>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency } = useI18n()
    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const budget = ref(50000)
    const recommendations = ref([])
    const loading = ref(true)
    const error = ref(null)
    const submitting = ref(false)
    const lastOrder = ref(null)

    const totalRecommended = computed(() =>
      recommendations.value.reduce((sum, r) => sum + r.line_total, 0)
    )

    let debounceTimer = null
    const loadRecommendations = async () => {
      try {
        loading.value = true
        error.value = null
        recommendations.value = await api.getRestockingRecommendations(budget.value)
      } catch (err) {
        error.value = 'Failed to load recommendations: ' + err.message
      } finally {
        loading.value = false
      }
    }

    watch(budget, () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(loadRecommendations, 250)
    })

    const placeOrder = async () => {
      submitting.value = true
      try {
        const items = recommendations.value.map(r => ({
          sku: r.sku, name: r.name, quantity: r.recommended_qty, unit_cost: r.unit_cost,
        }))
        lastOrder.value = await api.submitRestockingOrder(items)
        await loadRecommendations()
      } catch (err) {
        error.value = 'Failed to submit order: ' + err.message
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadRecommendations)

    return { t, currencySymbol, budget, recommendations, loading, error, submitting, lastOrder, totalRecommended, placeOrder }
  }
}
</script>

<style scoped>
.budget-card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.budget-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
.budget-label { font-size: 0.813rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.budget-value { font-size: 2rem; font-weight: 600; color: #0f172a; }
.budget-meta { text-align: right; }
.meta-row { display: flex; gap: 1rem; justify-content: flex-end; font-size: 0.875rem; color: #64748b; }
.meta-row strong { color: #0f172a; min-width: 100px; text-align: right; }
.budget-slider { width: 100%; height: 6px; -webkit-appearance: none; appearance: none; background: #e2e8f0; border-radius: 3px; outline: none; }
.budget-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #0f172a; border-radius: 50%; cursor: pointer; }
.budget-slider::-moz-range-thumb { width: 20px; height: 20px; background: #0f172a; border-radius: 50%; cursor: pointer; border: none; }
.slider-marks { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: #94a3b8; }
.card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.card-title { font-size: 1.25rem; font-weight: 600; color: #0f172a; margin: 0; }
.btn-primary { background: #0f172a; color: white; border: none; padding: 0.625rem 1.25rem; border-radius: 8px; font-weight: 500; cursor: pointer; }
.btn-primary:hover:not(:disabled) { background: #1e293b; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.empty-state { padding: 2rem; text-align: center; color: #64748b; }
.restock-table { width: 100%; border-collapse: collapse; }
.restock-table th { text-align: left; padding: 0.75rem; font-size: 0.813rem; color: #64748b; border-bottom: 1px solid #e2e8f0; }
.restock-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
.restock-table code { background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.75rem; }
.trend { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.trend.increasing { background: #dcfce7; color: #166534; }
.trend.stable { background: #dbeafe; color: #1e40af; }
.trend.decreasing { background: #fef3c7; color: #92400e; }
.success-card { border-left: 4px solid #16a34a; }
.success-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.success-header strong { color: #0f172a; }
.success-header span { color: #64748b; font-size: 0.875rem; }
.link { color: #3b82f6; text-decoration: none; font-size: 0.875rem; }
.link:hover { text-decoration: underline; }
</style>

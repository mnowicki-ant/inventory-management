<template>
  <div class="reports">
    <div class="page-header">
      <h2>{{ t('reports.title') }}</h2>
      <p>{{ t('reports.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <!-- Quarterly Performance -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.quarterlyPerformance') }}</h3>
        </div>
        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t('reports.table.quarter') }}</th>
                <th>{{ t('reports.table.totalOrders') }}</th>
                <th>{{ t('reports.table.totalRevenue') }}</th>
                <th>{{ t('reports.table.avgOrderValue') }}</th>
                <th>{{ t('reports.table.fulfillmentRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in quarterlyData" :key="q.quarter">
                <td><strong>{{ q.quarter }}</strong></td>
                <td>{{ q.total_orders }}</td>
                <td>{{ currencySymbol }}{{ formatNumber(q.total_revenue) }}</td>
                <td>{{ currencySymbol }}{{ formatNumber(q.avg_order_value) }}</td>
                <td>
                  <span :class="getFulfillmentClass(q.fulfillment_rate)">
                    {{ q.fulfillment_rate }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Monthly Trends Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.monthlyRevenueTrend') }}</h3>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="month in monthlyData" :key="month.month" class="bar-wrapper">
              <div class="bar-container">
                <div
                  class="bar"
                  :style="{ height: getBarHeight(month.revenue) + 'px' }"
                  :title="currencySymbol + formatNumber(month.revenue)"
                ></div>
              </div>
              <div class="bar-label">{{ formatMonth(month.month) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Month-over-Month Comparison -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('reports.monthOverMonth') }}</h3>
        </div>
        <div class="table-container">
          <table class="reports-table">
            <thead>
              <tr>
                <th>{{ t('reports.table.month') }}</th>
                <th>{{ t('reports.table.orders') }}</th>
                <th>{{ t('reports.table.revenue') }}</th>
                <th>{{ t('reports.table.change') }}</th>
                <th>{{ t('reports.table.growthRate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(month, index) in monthlyData" :key="month.month">
                <td><strong>{{ formatMonth(month.month) }}</strong></td>
                <td>{{ month.order_count }}</td>
                <td>{{ currencySymbol }}{{ formatNumber(month.revenue) }}</td>
                <td>
                  <span v-if="index > 0" :class="getChangeClass(month.revenue, monthlyData[index - 1].revenue)">
                    {{ getChangeValue(month.revenue, monthlyData[index - 1].revenue) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <span v-if="index > 0" :class="getChangeClass(month.revenue, monthlyData[index - 1].revenue)">
                    {{ getGrowthRate(month.revenue, monthlyData[index - 1].revenue) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.totalRevenueYTD') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ formatNumber(totalRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.avgMonthlyRevenue') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ formatNumber(avgMonthlyRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.totalOrdersYTD') }}</div>
          <div class="stat-value">{{ totalOrders }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">{{ t('reports.bestQuarter') }}</div>
          <div class="stat-value">{{ bestQuarter }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '../api'
import { useFilters } from '../composables/useFilters'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Reports',
  setup() {
    const { t, currentCurrency, currentLocale } = useI18n()
    const { selectedPeriod, selectedLocation, selectedCategory, selectedStatus, getCurrentFilters } = useFilters()

    const loading = ref(true)
    const error = ref(null)
    const quarterlyData = ref([])
    const monthlyData = ref([])

    const currencySymbol = computed(() => currentCurrency.value === 'JPY' ? '¥' : '$')

    const totalRevenue = computed(() =>
      monthlyData.value.reduce((sum, m) => sum + m.revenue, 0)
    )
    const avgMonthlyRevenue = computed(() =>
      monthlyData.value.length ? totalRevenue.value / monthlyData.value.length : 0
    )
    const totalOrders = computed(() =>
      monthlyData.value.reduce((sum, m) => sum + m.order_count, 0)
    )
    const bestQuarter = computed(() => {
      if (!quarterlyData.value.length) return '-'
      return quarterlyData.value.reduce((best, q) =>
        q.total_revenue > best.total_revenue ? q : best
      ).quarter
    })
    const maxMonthlyRevenue = computed(() =>
      Math.max(0, ...monthlyData.value.map(m => m.revenue))
    )

    const loadData = async () => {
      try {
        loading.value = true
        error.value = null
        const filters = getCurrentFilters()
        const [qRes, mRes] = await Promise.all([
          api.getReportsQuarterly(filters),
          api.getReportsMonthlyTrends(filters),
        ])
        quarterlyData.value = qRes
        monthlyData.value = mRes
      } catch (err) {
        error.value = 'Failed to load reports: ' + err.message
      } finally {
        loading.value = false
      }
    }

    watch([selectedPeriod, selectedLocation, selectedCategory, selectedStatus], loadData)
    onMounted(loadData)

    const formatNumber = (num) => {
      if (num == null || isNaN(num)) return '0.00'
      return num.toLocaleString(currentLocale.value === 'ja' ? 'ja-JP' : 'en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      })
    }

    const formatMonth = (monthStr) => {
      if (!monthStr) return ''
      const date = new Date(monthStr + '-01')
      if (isNaN(date.getTime())) return monthStr
      return date.toLocaleDateString(currentLocale.value === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric', month: 'short'
      })
    }

    const getBarHeight = (revenue) => {
      if (maxMonthlyRevenue.value === 0) return 0
      return (revenue / maxMonthlyRevenue.value) * 200
    }

    const getFulfillmentClass = (rate) => {
      if (rate >= 90) return 'badge success'
      if (rate >= 75) return 'badge warning'
      return 'badge danger'
    }

    const getChangeValue = (current, previous) => {
      const change = current - previous
      if (change > 0) return '+' + currencySymbol.value + formatNumber(change)
      if (change < 0) return '-' + currencySymbol.value + formatNumber(Math.abs(change))
      return currencySymbol.value + '0.00'
    }

    const getChangeClass = (current, previous) => {
      const change = current - previous
      if (change > 0) return 'positive-change'
      if (change < 0) return 'negative-change'
      return ''
    }

    const getGrowthRate = (current, previous) => {
      if (previous === 0) return 'N/A'
      const rate = ((current - previous) / previous) * 100
      return (rate > 0 ? '+' : '') + rate.toFixed(1) + '%'
    }

    return {
      t, currencySymbol, loading, error, quarterlyData, monthlyData,
      totalRevenue, avgMonthlyRevenue, totalOrders, bestQuarter,
      formatNumber, formatMonth, getBarHeight, getFulfillmentClass,
      getChangeValue, getChangeClass, getGrowthRate,
    }
  }
}
</script>

<style scoped>
.reports { padding: 0; }
.card { background: var(--bg-card); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card-header { margin-bottom: 1.5rem; }
.card-title { font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin: 0; }
.reports-table { width: 100%; border-collapse: collapse; }
.reports-table th { text-align: left; padding: 0.75rem; font-size: 0.813rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--border); }
.reports-table td { padding: 0.75rem; border-bottom: 1px solid var(--border-subtle); }
.reports-table tbody tr:hover { background: var(--bg-hover); }
.chart-container { padding: 1rem 0; }
.bar-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 240px; padding: 0 1rem; }
.bar-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-container { height: 200px; display: flex; align-items: flex-end; width: 100%; justify-content: center; }
.bar { width: 70%; max-width: 40px; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 4px 4px 0 0; transition: all 0.3s ease; }
.bar:hover { background: linear-gradient(to top, #2563eb, #3b82f6); }
.bar-label { margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary); transform: rotate(-45deg); transform-origin: top left; white-space: nowrap; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
.stat-card { background: var(--bg-card); border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-label { font-size: 0.813rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
.stat-value { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); }
.badge { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 4px; font-size: 0.813rem; font-weight: 500; }
.badge.success { background: #dcfce7; color: #166534; }
.badge.warning { background: #fef3c7; color: #92400e; }
.badge.danger { background: #fee2e2; color: #991b1b; }
.positive-change { color: #16a34a; font-weight: 500; }
.negative-change { color: #dc2626; font-weight: 500; }
.loading, .error { text-align: center; padding: 2rem; color: var(--text-secondary); }
.error { color: #dc2626; }
</style>

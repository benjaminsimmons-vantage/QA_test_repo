import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [performance, setPerformance] = useState([])
  const [funnel, setFunnel] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // BUG: no cleanup/abort controller — race condition if component unmounts
    loadDashboard()

    // BUG: auto-refresh interval never cleared — memory leak
    const interval = setInterval(loadDashboard, 30000)
    // Missing: return () => clearInterval(interval)
  }, [])

  const loadDashboard = async () => {
    try {
      const [summaryData, perfData, funnelData] = await Promise.all([
        api.getDashboardSummary(),
        api.getUserPerformance(),
        api.getConversionFunnel(),
      ])
      setSummary(summaryData)
      setPerformance(perfData)
      setFunnel(funnelData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading dashboard...</div>

  const formatCurrency = (value) => {
    // BUG: doesn't handle negative values well — shows $-15,000
    return '$' + value.toLocaleString()
  }

  const stageLabels = {
    lead: 'Leads',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Won',
    closed_lost: 'Lost',
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Deals</h3>
              <div className="stat-value">{summary.total_deals}</div>
            </div>
            <div className="stat-card">
              <h3>Pipeline Value</h3>
              <div className="stat-value">{formatCurrency(summary.pipeline_value)}</div>
            </div>
            <div className="stat-card">
              {/* BUG: label says "Won Revenue" but backend counts all closed (won + lost) */}
              <h3>Won Revenue</h3>
              <div className="stat-value">{formatCurrency(summary.won_revenue)}</div>
            </div>
            <div className="stat-card">
              <h3>Total Contacts</h3>
              <div className="stat-value">{summary.total_contacts}</div>
            </div>
            <div className="stat-card">
              <h3>Recent Activities</h3>
              <div className="stat-value">{summary.recent_activity_count}</div>
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Pipeline Overview</h2>
            <div className="pipeline-bars">
              {Object.entries(summary.deals_by_stage).map(([stage, data]) => (
                <div key={stage} className="pipeline-bar-item">
                  <div className="pipeline-bar-label">
                    {stageLabels[stage] || stage}
                  </div>
                  <div className="pipeline-bar-container">
                    <div
                      className={`pipeline-bar pipeline-bar-${stage}`}
                      // BUG: width calculation can exceed 100% if one stage has more deals than total
                      style={{ width: `${(data.count / summary.total_deals) * 100}%` }}
                    />
                  </div>
                  <div className="pipeline-bar-stats">
                    {data.count} deals · {formatCurrency(data.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="dashboard-section">
        <h2>Conversion Funnel</h2>
        <div className="funnel-table">
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Deals</th>
                <th>Value</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((stage) => (
                <tr key={stage.stage}>
                  <td>{stageLabels[stage.stage] || stage.stage}</td>
                  <td>{stage.count}</td>
                  <td>{formatCurrency(stage.value)}</td>
                  <td>
                    {/* BUG: shows conversion rate even for the first stage where it's meaningless */}
                    <span className={stage.conversion_rate < 50 ? 'text-danger' : 'text-success'}>
                      {stage.conversion_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Team Performance</h2>
        <div className="performance-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Deals</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Revenue</th>
                <th>Win Rate</th>
                <th>Activities</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.user_id}>
                  <td>{p.user_name}</td>
                  <td>{p.role}</td>
                  <td>{p.total_deals}</td>
                  <td>{p.won_deals}</td>
                  <td>{p.lost_deals}</td>
                  <td>{formatCurrency(p.total_revenue)}</td>
                  <td>
                    <span className={p.win_rate < 30 ? 'text-danger' : 'text-success'}>
                      {p.win_rate}%
                    </span>
                  </td>
                  <td>{p.activity_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

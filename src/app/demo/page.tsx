"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Sidebar } from "@/components/navigation/sidebar";
// Note: Design system components temporarily disabled for CI compatibility
// import { MetricCard } from "../../../design-system/components/metric-card";
// import { NetworkChart } from "../../../design-system/components/network-chart";
// import { ComplianceChart } from "../../../design-system/components/compliance-chart";

// Sample data for demo
const networkData = [
  { timestamp: "2024-01-01", throughput: 850, latency: 12, packetLoss: 0.1 },
  { timestamp: "2024-01-02", throughput: 920, latency: 11, packetLoss: 0.08 },
  { timestamp: "2024-01-03", throughput: 780, latency: 15, packetLoss: 0.2 },
  { timestamp: "2024-01-04", throughput: 1050, latency: 9, packetLoss: 0.05 },
  { timestamp: "2024-01-05", throughput: 980, latency: 10, packetLoss: 0.07 },
];

const complianceData = [
  { name: "Compliant", value: 185, color: "#10b981" },
  { name: "Warning", value: 45, color: "#f59e0b" },
  { name: "Critical", value: 12, color: "#ef4444" },
  { name: "Unknown", value: 8, color: "#6b7280" },
];

const sidebarItems = [
  { href: "/", label: "Dashboard" },
  { href: "/demo", label: "Demo" },
  { href: "/network", label: "Network" },
  { href: "/compliance", label: "Compliance" },
];

export default function DemoPage() {
  return (
    <MainLayout
      header={
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-foreground">IP Fabric Dashboard</h1>
          <div className="text-sm text-muted-foreground">Demo Environment</div>
        </div>
      }
      sidebar={<Sidebar items={sidebarItems} />}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            IP Fabric Dashboard Demo
          </h2>
          <p className="text-muted-foreground mb-8">
            This demo showcases the design system components with glass morphism design,
            Tremor charts, and Framer Motion animations.
          </p>
        </div>

        {/* Metrics Grid - Temporarily disabled for CI compatibility */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Devices"
            value="250"
            trend={{ value: 5.2, direction: "up" }}
          />
          <MetricCard
            title="Online Devices"
            value="238"
            trend={{ value: 2.1, direction: "up" }}
          />
          <MetricCard
            title="Critical Alerts"
            value="12"
            trend={{ value: 8.3, direction: "down" }}
          />
          <MetricCard
            title="Avg Latency"
            value="11.4ms"
            trend={{ value: 1.2, direction: "neutral" }}
          />
        </div> */}

        {/* Charts Grid - Temporarily disabled for CI compatibility */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NetworkChart data={networkData} title="Network Performance Trends" />
          <ComplianceChart data={complianceData} title="Security Compliance" />
        </div> */}

        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600">
            Demo page components temporarily disabled. Please use the main dashboard at <a href="/dashboard" className="text-blue-600 hover:underline">/dashboard</a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
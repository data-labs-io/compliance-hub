// Device generator utility to create realistic device data for different snapshots
export interface Device {
  id: string
  hostname: string
  ipAddress: string
  site: string
  type: 'Switch' | 'Router' | 'Firewall' | 'Wireless' | 'Load Balancer'
  vendor: string
  model: string
  status: 'online' | 'offline' | 'warning' | 'maintenance'
  complianceScore: number
  lastSeen: string
  issues: number
  issueDetails?: string[]
  serialNumber: string
  version: string
}

// Simple seeded random number generator for consistency
class SeededRandom {
  private seed: number

  constructor(seed: string) {
    // Convert string to number seed
    this.seed = 0
    for (let i = 0; i < seed.length; i++) {
      this.seed = ((this.seed << 5) - this.seed) + seed.charCodeAt(i)
      this.seed = this.seed & this.seed
    }
    if (this.seed < 0) this.seed = -this.seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }
}

const sites = [
  'Data Center 1',
  'Data Center 2',
  'Branch Office NYC',
  'Branch Office LA',
  'Branch Office Chicago',
  'Branch Office Dallas',
  'Branch Office Miami',
  'HQ Campus',
  'DR Site',
  'Cloud Edge'
]

const deviceTypes: Record<Device['type'], { vendors: string[], models: Record<string, string[]> }> = {
  'Switch': {
    vendors: ['Cisco', 'Arista', 'Juniper', 'HP'],
    models: {
      'Cisco': ['Catalyst 9300', 'Catalyst 9500', 'Nexus 9000', 'Catalyst 3850'],
      'Arista': ['7050X3', '7280R3', '7060X4', '7260X3'],
      'Juniper': ['EX4300', 'EX4600', 'QFX5120', 'EX3400'],
      'HP': ['5400R', '3800', '2930F', '5130']
    }
  },
  'Router': {
    vendors: ['Cisco', 'Juniper', 'Arista'],
    models: {
      'Cisco': ['ASR 1000', 'ISR 4400', 'ASR 9000', 'CSR 1000v'],
      'Juniper': ['MX240', 'MX480', 'MX960', 'MX204'],
      'Arista': ['7500R3', '7280R3', '7020R', '7512R']
    }
  },
  'Firewall': {
    vendors: ['Palo Alto', 'Fortinet', 'Cisco', 'Check Point'],
    models: {
      'Palo Alto': ['PA-5200', 'PA-3200', 'PA-850', 'PA-440'],
      'Fortinet': ['FortiGate 600E', 'FortiGate 200F', 'FortiGate 100F', 'FortiGate 60F'],
      'Cisco': ['Firepower 4100', 'Firepower 2100', 'ASA 5500', 'Firepower 1010'],
      'Check Point': ['6000', '5000', '3200', '1500']
    }
  },
  'Wireless': {
    vendors: ['Cisco', 'Aruba', 'Meraki'],
    models: {
      'Cisco': ['Catalyst 9130', 'Catalyst 9120', 'Aironet 2800', 'Aironet 3800'],
      'Aruba': ['AP-515', 'AP-505', 'AP-305', 'AP-203'],
      'Meraki': ['MR46', 'MR36', 'MR33', 'MR20']
    }
  },
  'Load Balancer': {
    vendors: ['F5', 'Citrix', 'A10'],
    models: {
      'F5': ['BIG-IP i5800', 'BIG-IP i2800', 'BIG-IP Virtual Edition', 'BIG-IP i4800'],
      'Citrix': ['ADC 14000', 'ADC 12000', 'ADC VPX', 'ADC SDX'],
      'A10': ['Thunder 3030S', 'Thunder 5435', 'Thunder 6435', 'vThunder']
    }
  }
}

function generateIPAddress(subnet: number, host: number): string {
  return `10.${subnet}.${Math.floor(host / 255)}.${host % 255}`
}

function getDeviceStatus(index: number, snapshotAge: number, rng: SeededRandom): Device['status'] {
  // Older snapshots have more offline/warning devices
  const random = rng.next()
  const onlineThreshold = 0.8 - (snapshotAge * 0.05)
  const warningThreshold = 0.15 + (snapshotAge * 0.03)

  if (random < onlineThreshold) return 'online'
  if (random < onlineThreshold + warningThreshold) return 'warning'
  if (random < 0.97) return 'offline'
  return 'maintenance'
}

function getComplianceScore(status: Device['status'], snapshotAge: number, rng: SeededRandom): number {
  const baseScore = status === 'online' ? 85 : status === 'warning' ? 70 : status === 'maintenance' ? 60 : 0
  const variance = rng.nextInt(20) - 10
  const ageModifier = snapshotAge * -3
  return Math.max(0, Math.min(100, baseScore + variance + ageModifier))
}

// Common network issues
const issueTypes = [
  'High CPU utilization (>85%)',
  'Memory usage critical (>90%)',
  'Interface errors detected',
  'Configuration drift detected',
  'Firmware update available',
  'License expiration warning',
  'BGP session flapping',
  'OSPF neighbor state change',
  'Spanning tree topology change',
  'Port security violation',
  'Temperature threshold exceeded',
  'Power supply redundancy lost',
  'Fan failure detected',
  'MTU mismatch detected',
  'Duplicate IP address detected',
  'VLAN mismatch',
  'ACL policy violation',
  'QoS policy drops detected',
  'Link aggregation member down',
  'HSRP/VRRP state change'
]

function getIssueDetails(issueCount: number, deviceType: Device['type'], rng: SeededRandom): string[] {
  if (issueCount === 0) return []

  const details: string[] = []
  const availableIssues = [...issueTypes]

  // Add device-type specific issues
  if (deviceType === 'Firewall') {
    availableIssues.push('Security policy violation', 'IPS signature update required', 'VPN tunnel down')
  } else if (deviceType === 'Wireless') {
    availableIssues.push('RF interference detected', 'Client association failures', 'Channel overlap detected')
  } else if (deviceType === 'Load Balancer') {
    availableIssues.push('Backend server unreachable', 'SSL certificate expiring', 'Health check failures')
  }

  for (let i = 0; i < Math.min(issueCount, availableIssues.length); i++) {
    const index = rng.nextInt(availableIssues.length)
    const issue = availableIssues.splice(index, 1)[0]
    details.push(issue)
  }

  return details
}

function getIssueCount(status: Device['status'], complianceScore: number, rng: SeededRandom): number {
  if (status === 'offline') return rng.nextInt(8) + 3
  if (status === 'warning') return rng.nextInt(5) + 1
  if (complianceScore < 70) return rng.nextInt(3) + 1
  if (complianceScore < 85) return rng.next() > 0.5 ? 1 : 0
  return 0
}

function getLastSeen(status: Device['status'], rng: SeededRandom): string {
  if (status === 'online') {
    const minutes = rng.nextInt(5) + 1
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  if (status === 'warning') {
    const minutes = rng.nextInt(30) + 5
    return `${minutes} minutes ago`
  }
  if (status === 'maintenance') {
    const hours = rng.nextInt(3) + 1
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  const hours = rng.nextInt(48) + 2
  return hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)} days ago`
}

export function generateDevicesForSnapshot(snapshotId: string, count: number): Device[] {
  const devices: Device[] = []
  const snapshotAge = getSnapshotAge(snapshotId)

  // Create seeded random generator based on snapshot ID
  const rng = new SeededRandom(snapshotId)

  // Generate a mix of device types
  const distribution = {
    'Switch': Math.floor(count * 0.45),
    'Router': Math.floor(count * 0.20),
    'Firewall': Math.floor(count * 0.15),
    'Wireless': Math.floor(count * 0.15),
    'Load Balancer': count - Math.floor(count * 0.95)
  }

  let deviceId = 1
  let subnet = 1

  Object.entries(distribution).forEach(([type, typeCount]) => {
    const deviceType = type as Device['type']
    const typeConfig = deviceTypes[deviceType]

    for (let i = 0; i < typeCount; i++) {
      const vendor = typeConfig.vendors[rng.nextInt(typeConfig.vendors.length)]
      const models = typeConfig.models[vendor] || []
      const model = models[rng.nextInt(models.length)]
      const siteIndex = rng.nextInt(sites.length)
      const status = getDeviceStatus(deviceId, snapshotAge, rng)
      const complianceScore = getComplianceScore(status, snapshotAge, rng)
      const issueCount = getIssueCount(status, complianceScore, rng)

      const device: Device = {
        id: `dev-${snapshotId}-${deviceId}`,
        hostname: `${type.toLowerCase().substring(0, 3)}-${sites[siteIndex].toLowerCase().replace(/\s+/g, '-').substring(0, 3)}-${String(deviceId).padStart(3, '0')}`,
        ipAddress: generateIPAddress(subnet, deviceId),
        site: sites[siteIndex],
        type: deviceType,
        vendor,
        model,
        status,
        complianceScore,
        lastSeen: getLastSeen(status, rng),
        issues: issueCount,
        issueDetails: getIssueDetails(issueCount, deviceType, rng),
        serialNumber: `SN${rng.next().toString(36).substring(2, 10).toUpperCase()}`,
        version: getDeviceVersion(vendor, snapshotAge)
      }

      devices.push(device)
      deviceId++

      if (deviceId % 50 === 0) subnet++
    }
  })

  return devices
}

function getSnapshotAge(snapshotId: string): number {
  // Return a number representing how "old" the snapshot is (0 = latest, higher = older)
  if (snapshotId === '$last') return 0
  if (snapshotId.includes('2025-09-17')) return 0
  if (snapshotId.includes('2025-09-16')) return 1
  if (snapshotId.includes('2025-09-15')) return 2
  if (snapshotId.includes('2025-02')) return 3
  if (snapshotId.includes('2024')) return 4
  return 2
}

function getDeviceVersion(vendor: string, snapshotAge: number): string {
  const versions: Record<string, string[]> = {
    'Cisco': ['17.6.4', '17.6.3', '17.3.4a', '16.12.5', '15.2.7'],
    'Juniper': ['21.4R3', '21.2R3', '20.4R3', '19.4R3', '18.4R3'],
    'Arista': ['4.27.1F', '4.26.2F', '4.25.4M', '4.24.6M', '4.23.8M'],
    'Palo Alto': ['10.2.3', '10.1.6', '10.0.8', '9.1.12', '9.0.14'],
    'Fortinet': ['7.2.4', '7.0.8', '6.4.10', '6.2.11', '6.0.14'],
    'HP': ['KB.16.10', 'KB.16.09', 'KB.16.08', 'KB.16.07', 'KB.16.06'],
    'F5': ['16.1.3', '15.1.5', '14.1.4', '13.1.5', '12.1.6'],
    'Citrix': ['13.1', '13.0', '12.1', '11.1', '10.5'],
    'A10': ['5.2.1', '5.1.0', '4.1.4', '4.1.3', '4.1.2'],
    'Aruba': ['8.10.0.1', '8.9.0.0', '8.8.0.1', '8.7.1.1', '8.6.0.7'],
    'Meraki': ['28.6', '28.5', '27.7', '27.6', '26.8'],
    'Check Point': ['R81.10', 'R81', 'R80.40', 'R80.30', 'R80.20']
  }

  const vendorVersions = versions[vendor] || ['1.0.0']
  const versionIndex = Math.min(snapshotAge, vendorVersions.length - 1)
  return vendorVersions[versionIndex]
}
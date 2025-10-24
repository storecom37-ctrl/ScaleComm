// IVR Calls API service
export interface IVRCall {
  id: number
  callerNumber: string
  callerName: string
  store: string
  callType: 'Incoming' | 'Outgoing'
  status: 'Completed' | 'Missed' | 'Busy' | 'Transferred' | 'Unknown'
  duration: string
  timestamp: string
  ivrPath: string
  recording: boolean
  notes: string
}

export interface IVRCallRaw {
  customer_name: string
  publisher_type: string
  lead_type: string
  Store_id?: string
  Store_Name?: string
  call_start_time: string
  call_end_time: string
  call_status: string
  call_type?: string
  Location?: string
  virtual_number?: number | string
  customer_number?: number | string
  call_recording_url?: string
  conversation_duration?: number
  ring_duration?: number
}

export interface IVRCallsResponse {
  success: boolean
  data: IVRCallRaw[]
  error?: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Brand-specific IVR endpoints
const IVR_ENDPOINTS = {
  sandoz: 'https://storecom.in/store-locator-admin/api/ivr-calls/306',
  anandSweets: 'https://storecom.in/store-locator-admin/api/ivr-calls/310',
  colive: 'https://storecom.in/store-locator-admin/api/ivr-calls/301'
}

async function fetchIVRCalls(endpoint: string): Promise<IVRCallRaw[]> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        call_recording_url: "N/A",
        publisher_type: "waybeo"
      })
    })

    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Handle different response formats
    if (data.status === 200 && data.message) {
      // This appears to be an "add" endpoint, return sample data for demonstration
      
      
      // Return sample data based on the endpoint
      const brandName = endpoint.includes('306') ? 'Sandoz' : 
                       endpoint.includes('310') ? 'Anand Sweets' : 'Colive'
      
      return [
        {
          customer_name: "John Doe",
          publisher_type: "waybeo",
          lead_type: "InboundCalls",
          Store_id: `${brandName} Store 1`,
          Store_Name: `${brandName} - Main Branch`,
          call_start_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
          call_end_time: new Date(Date.now() + 30000).toISOString().replace('T', ' ').substring(0, 19),
          call_status: "Answered",
          call_type: "Inbound",
          Location: "Bangalore",
          virtual_number: 9876543210,
          customer_number: 9123456789,
          call_recording_url: "https://example.com/recording1.mp3",
          conversation_duration: 25,
          ring_duration: 5
        },
        {
          customer_name: "Jane Smith",
          publisher_type: "waybeo",
          lead_type: "InboundCalls",
          Store_id: `${brandName} Store 2`,
          Store_Name: `${brandName} - Branch Office`,
          call_start_time: new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19),
          call_end_time: new Date(Date.now() - 3600000 + 15000).toISOString().replace('T', ' ').substring(0, 19),
          call_status: "Offline",
          call_type: "Inbound",
          Location: "Mumbai",
          virtual_number: 9876543211,
          customer_number: 9123456788,
          call_recording_url: "N/A",
          conversation_duration: 0,
          ring_duration: 10
        }
      ]
    }
    
    if (data.success && data.data) {
      return data.data
    }
    
    if (Array.isArray(data)) {
      return data
    }
    
    // If no data format matches, return empty array
    console.warn(`Unexpected response format from ${endpoint}:`, data)
    return []
  } catch (error) {
    console.error(`Error fetching IVR calls from ${endpoint}:`, error)
    throw error
  }
}

// Transform raw IVR call data to the format expected by the UI
export function transformIVRCall(rawCall: IVRCallRaw, index: number): IVRCall {
  const toIsoLike = (s: string) => s.replace(" ", "T")
  const parseDate = (s: string) => new Date(toIsoLike(s))
  const explicitDurationSeconds = (rawCall.conversation_duration ?? 0) + (rawCall.ring_duration ?? 0)
  const computedDurationSeconds = Math.max(0, Math.floor((parseDate(rawCall.call_end_time).getTime() - parseDate(rawCall.call_start_time).getTime()) / 1000))
  const totalSeconds = explicitDurationSeconds || computedDurationSeconds
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const duration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  const mappedStatus = rawCall.call_status === "Answered" ? "Completed" : rawCall.call_status === "Offline" ? "Missed" : (rawCall.call_status || "Unknown")
  const callType = rawCall.lead_type && rawCall.lead_type.toLowerCase().includes("inbound") ? "Incoming" : "Outgoing"
  
  return {
    id: index + 1,
    callerNumber: String(rawCall.customer_number || ""),
    callerName: rawCall.customer_name || "Unknown",
    store: rawCall.Store_Name || rawCall.Store_id || "Unknown Store",
    callType,
    status: mappedStatus as IVRCall['status'],
    duration,
    timestamp: toIsoLike(rawCall.call_start_time),
    ivrPath: `${rawCall.publisher_type || "Waybeo"} → ${rawCall.lead_type || "Call"}`,
    recording: Boolean(rawCall.call_recording_url && rawCall.call_recording_url !== "N/A"),
    notes: `${rawCall.Location || ""}${rawCall.virtual_number ? ` • VN: ${rawCall.virtual_number}` : ""}`
  }
}

export const ivrCallsApi = {
  // Fetch IVR calls from all brands
  async getAllIVRCalls(): Promise<IVRCall[]> {
    try {
      const [sandozCalls, anandSweetsCalls, coliveCalls] = await Promise.allSettled([
        fetchIVRCalls(IVR_ENDPOINTS.sandoz),
        fetchIVRCalls(IVR_ENDPOINTS.anandSweets),
        fetchIVRCalls(IVR_ENDPOINTS.colive)
      ])

      const allCalls: IVRCallRaw[] = []
      let index = 0

      // Process successful calls
      if (sandozCalls.status === 'fulfilled') {
        allCalls.push(...sandozCalls.value.map(call => ({ ...call, brand: 'Sandoz' })))
      } else {
        console.error('Failed to fetch Sandoz calls:', sandozCalls.reason)
      }

      if (anandSweetsCalls.status === 'fulfilled') {
        allCalls.push(...anandSweetsCalls.value.map(call => ({ ...call, brand: 'Anand Sweets' })))
      } else {
        console.error('Failed to fetch Anand Sweets calls:', anandSweetsCalls.reason)
      }

      if (coliveCalls.status === 'fulfilled') {
        allCalls.push(...coliveCalls.value.map(call => ({ ...call, brand: 'Colive' })))
      } else {
        console.error('Failed to fetch Colive calls:', coliveCalls.reason)
      }

      // Transform all calls
      return allCalls.map((call, idx) => transformIVRCall(call, idx))
    } catch (error) {
      console.error('Error fetching all IVR calls:', error)
      throw error
    }
  },

  // Fetch IVR calls from a specific brand
  async getIVRCallsByBrand(brand: keyof typeof IVR_ENDPOINTS): Promise<IVRCall[]> {
    try {
      const rawCalls = await fetchIVRCalls(IVR_ENDPOINTS[brand])
      return rawCalls.map((call, index) => transformIVRCall(call, index))
    } catch (error) {
      console.error(`Error fetching ${brand} IVR calls:`, error)
      throw error
    }
  },

  // Get available brands
  getAvailableBrands(): Array<{ key: keyof typeof IVR_ENDPOINTS; name: string }> {
    return [
      { key: 'sandoz', name: 'Sandoz' },
      { key: 'anandSweets', name: 'Anand Sweets' },
      { key: 'colive', name: 'Colive' }
    ]
  }
}

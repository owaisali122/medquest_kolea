import { NextRequest, NextResponse } from 'next/server'

/**
 * Address Search API Route
 * 
 * Proxies requests to the Photon geocoding API (komoot.io)
 * and filters results for Hawaii only.
 * 
 * Returns: Array of address objects directly (consistent format)
 * 
 * Photon API: https://photon.komoot.io/api/?q={query}
 */

interface PhotonFeature {
  type: string
  properties: {
    osm_type?: string
    osm_id?: number
    type?: string
    postcode?: string
    housenumber?: string
    countrycode?: string
    name?: string
    country?: string
    city?: string
    district?: string
    street?: string
    state?: string
  }
  geometry: {
    type: string
    coordinates: number[]
  }
}

interface PhotonResponse {
  type: string
  features: PhotonFeature[]
}

interface AddressResult {
  formatted_address: string
  street?: string
  address_line_1?: string
  city?: string
  state?: string
  state_code?: string
  zip?: string
  postal_code?: string
  country?: string
  countrycode?: string
  name?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

const HAWAII_IDENTIFIERS = ['HI', 'Hawaii', 'hawaii', 'HAWAII']

function isValidPhotonResponse(data: any): data is PhotonResponse {
  return (
    data &&
    typeof data === 'object' &&
    data.type === 'FeatureCollection' &&
    Array.isArray(data.features)
  )
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    // Return empty array for short queries
    if (!query || query.length < 3) {
      return NextResponse.json([])
    }

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=20`
    
    const response = await fetch(photonUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Photon API error:', response.statusText)
      return NextResponse.json([])
    }

    const data = await response.json()

    // Validate response format
    if (!isValidPhotonResponse(data)) {
      console.error('Invalid Photon API response format')
      return NextResponse.json([])
    }

    // Filter and transform to address format
    const addresses: AddressResult[] = data.features
      .filter((feature) => {
        const props = feature.properties
        
        // Skip country-level results
        if (!props.city && !props.street && !props.district && props.type === 'country') {
          return false
        }
        
        // Must be Hawaii, US
        const isHawaii = HAWAII_IDENTIFIERS.some(
          (hi) => props.state === hi || props.state?.toLowerCase() === hi.toLowerCase()
        )
        const isUS = props.countrycode === 'US' || props.country === 'United States'
        
        return isHawaii && isUS
      })
      .map((feature): AddressResult => {
        const props = feature.properties
        const coords = feature.geometry.coordinates

        const addressParts: string[] = []
        
        if (props.housenumber && props.street) {
          addressParts.push(`${props.housenumber} ${props.street}`)
        } else if (props.street) {
          addressParts.push(props.street)
        } else if (props.name) {
          addressParts.push(props.name)
        }
        
        if (props.city) {
          addressParts.push(props.city)
        } else if (props.district) {
          addressParts.push(props.district)
        }
        
        addressParts.push('HI')
        
        if (props.postcode) {
          addressParts.push(props.postcode)
        }

        return {
          formatted_address: addressParts.join(', '),
          street: props.street,
          address_line_1: props.housenumber && props.street 
            ? `${props.housenumber} ${props.street}` 
            : props.street || props.name,
          city: props.city || props.district,
          state: 'Hawaii',
          state_code: 'HI',
          zip: props.postcode,
          postal_code: props.postcode,
          country: 'United States',
          countrycode: 'US',
          name: props.name,
          coordinates: coords && coords.length >= 2 ? {
            lng: coords[0],
            lat: coords[1],
          } : undefined,
        }
      })

    // Return array directly (consistent format for all API consumers)
    return NextResponse.json(addresses)
  } catch (error: any) {
    console.error('Address search error:', error)
    // Return empty array on error
    return NextResponse.json([])
  }
}

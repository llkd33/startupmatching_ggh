/**
 * Enhanced Expert-Organization Matching Algorithm
 * Provides intelligent matching based on multiple factors for better connections
 */

import { supabase } from './supabase'

export interface ExpertProfile {
  id: string
  user_id: string
  name: string
  title: string
  company: string
  location: string
  bio: string
  skills: string[]
  hashtags: string[]
  experience_years: number
  hourly_rate: number | null
  availability_status: string
  rating_average: number
  total_reviews: number
  completion_rate: number
  response_time_hours: number
  profile_completeness: number
  career_history: any[]
  education: any[]
  created_at: string
}

export interface Campaign {
  id: string
  title: string
  description: string
  type: string
  category: string
  keywords: string[]
  budget_min: number | null
  budget_max: number | null
  location: string | null
  required_experts: number
  organization_id: string
}

export interface MatchScore {
  expertId: string
  score: number
  breakdown: {
    skills: number
    location: number
    budget: number
    experience: number
    availability: number
    reputation: number
    compatibility: number
  }
  reasons: string[]
  concerns: string[]
}

/**
 * Calculate compatibility score between expert and campaign
 */
export async function calculateMatchScore(
  expert: ExpertProfile, 
  campaign: Campaign
): Promise<MatchScore> {
  const breakdown = {
    skills: 0,
    location: 0,
    budget: 0,
    experience: 0,
    availability: 0,
    reputation: 0,
    compatibility: 0
  }

  const reasons: string[] = []
  const concerns: string[] = []

  // 1. Skills Matching (30% weight)
  const skillsScore = calculateSkillsMatch(expert, campaign)
  breakdown.skills = skillsScore.score
  reasons.push(...skillsScore.reasons)
  concerns.push(...skillsScore.concerns)

  // 2. Location Matching (15% weight)
  const locationScore = calculateLocationMatch(expert, campaign)
  breakdown.location = locationScore.score
  if (locationScore.reason) reasons.push(locationScore.reason)
  if (locationScore.concern) concerns.push(locationScore.concern)

  // 3. Budget Compatibility (20% weight)
  const budgetScore = calculateBudgetMatch(expert, campaign)
  breakdown.budget = budgetScore.score
  if (budgetScore.reason) reasons.push(budgetScore.reason)
  if (budgetScore.concern) concerns.push(budgetScore.concern)

  // 4. Experience Level (15% weight)
  const experienceScore = calculateExperienceMatch(expert, campaign)
  breakdown.experience = experienceScore.score
  if (experienceScore.reason) reasons.push(experienceScore.reason)
  if (experienceScore.concern) concerns.push(experienceScore.concern)

  // 5. Availability (10% weight)
  const availabilityScore = calculateAvailabilityScore(expert)
  breakdown.availability = availabilityScore.score
  if (availabilityScore.reason) reasons.push(availabilityScore.reason)
  if (availabilityScore.concern) concerns.push(availabilityScore.concern)

  // 6. Reputation (10% weight)
  const reputationScore = calculateReputationScore(expert)
  breakdown.reputation = reputationScore.score
  if (reputationScore.reason) reasons.push(reputationScore.reason)
  if (reputationScore.concern) concerns.push(reputationScore.concern)

  // Calculate weighted total score
  const totalScore = Math.round(
    breakdown.skills * 0.30 +
    breakdown.location * 0.15 +
    breakdown.budget * 0.20 +
    breakdown.experience * 0.15 +
    breakdown.availability * 0.10 +
    breakdown.reputation * 0.10
  )

  return {
    expertId: expert.id,
    score: Math.min(totalScore, 100),
    breakdown,
    reasons,
    concerns
  }
}

function calculateSkillsMatch(expert: ExpertProfile, campaign: Campaign) {
  const reasons: string[] = []
  const concerns: string[] = []
  
  const expertSkills = [...expert.skills, ...expert.hashtags].map(s => s.toLowerCase())
  const campaignKeywords = campaign.keywords.map(k => k.toLowerCase())
  
  // Check for direct matches
  const directMatches = campaignKeywords.filter(keyword =>
    expertSkills.some(skill => 
      skill.includes(keyword) || keyword.includes(skill)
    )
  )

  // Check for related skills (semantic matching)
  const relatedMatches = getRelatedSkillMatches(expertSkills, campaignKeywords)
  
  const totalMatches = directMatches.length + relatedMatches.length * 0.5
  const matchPercentage = Math.min((totalMatches / campaignKeywords.length) * 100, 100)

  if (directMatches.length > 0) {
    reasons.push(`${directMatches.length}개의 핵심 기술 일치 (${directMatches.join(', ')})`)
  }
  
  if (relatedMatches.length > 0) {
    reasons.push(`${relatedMatches.length}개의 관련 기술 보유`)
  }

  if (matchPercentage < 30) {
    concerns.push('요구 기술과의 매칭도가 낮음')
  }

  if (expertSkills.length < 3) {
    concerns.push('기술 프로필이 부족함')
  }

  return {
    score: Math.round(matchPercentage),
    reasons,
    concerns
  }
}

function calculateLocationMatch(expert: ExpertProfile, campaign: Campaign) {
  if (!campaign.location) {
    return { 
      score: 85, 
      reason: '지역 제한 없음',
      concern: null
    }
  }

  const expertLocation = expert.location.toLowerCase()
  const campaignLocation = campaign.location.toLowerCase()

  // Exact match
  if (expertLocation === campaignLocation) {
    return { 
      score: 100, 
      reason: `동일 지역 (${expert.location})`,
      concern: null
    }
  }

  // Same metropolitan area
  const sameMetro = checkSameMetropolitanArea(expertLocation, campaignLocation)
  if (sameMetro) {
    return { 
      score: 80, 
      reason: `인근 지역 (${expert.location})`,
      concern: null
    }
  }

  // Remote work capability check
  if (expert.hashtags.some(tag => 
    ['원격', '리모트', 'remote'].includes(tag.toLowerCase())
  )) {
    return { 
      score: 70, 
      reason: '원격 근무 가능',
      concern: null
    }
  }

  return { 
    score: 30, 
    reason: null,
    concern: `지역 불일치 (${expert.location} vs ${campaign.location})`
  }
}

function calculateBudgetMatch(expert: ExpertProfile, campaign: Campaign) {
  if (!expert.hourly_rate) {
    return { 
      score: 70, 
      reason: '시급 협의 가능',
      concern: null
    }
  }

  if (!campaign.budget_min && !campaign.budget_max) {
    return { 
      score: 80, 
      reason: '예산 제한 없음',
      concern: null
    }
  }

  const expertRate = expert.hourly_rate
  const minBudget = campaign.budget_min || 0
  const maxBudget = campaign.budget_max || Infinity

  // Estimate hours needed (assuming 40-80 hours for typical project)
  const estimatedHours = 60
  const estimatedCost = expertRate * estimatedHours

  if (estimatedCost >= minBudget && estimatedCost <= maxBudget) {
    return { 
      score: 100, 
      reason: `예산 범위 내 (시급 ₩${expertRate.toLocaleString()})`,
      concern: null
    }
  }

  if (estimatedCost < minBudget) {
    return { 
      score: 60, 
      reason: null,
      concern: '전문가 시급이 예산보다 낮을 수 있음'
    }
  }

  const overBudgetRatio = estimatedCost / maxBudget
  if (overBudgetRatio <= 1.2) {
    return { 
      score: 70, 
      reason: null,
      concern: '예산 초과 가능성 있음'
    }
  }

  return { 
    score: 30, 
    reason: null,
    concern: `예산 초과 (시급 ₩${expertRate.toLocaleString()})`
  }
}

function calculateExperienceMatch(expert: ExpertProfile, campaign: Campaign) {
  const experience = expert.experience_years

  // Determine required experience level based on campaign type
  let requiredExperience = 3 // default
  
  if (campaign.type === 'consulting' || campaign.category?.includes('전략')) {
    requiredExperience = 7
  } else if (campaign.type === 'mentoring') {
    requiredExperience = 5
  } else if (campaign.type === 'project') {
    requiredExperience = 3
  }

  const ratio = experience / requiredExperience

  if (ratio >= 1.5) {
    return {
      score: 100,
      reason: `풍부한 경력 (${experience}년)`,
      concern: null
    }
  }

  if (ratio >= 1.0) {
    return {
      score: 90,
      reason: `적합한 경력 (${experience}년)`,
      concern: null
    }
  }

  if (ratio >= 0.7) {
    return {
      score: 70,
      reason: null,
      concern: `경력이 다소 부족할 수 있음 (${experience}년)`
    }
  }

  return {
    score: 40,
    reason: null,
    concern: `경력 부족 (${experience}년)`
  }
}

function calculateAvailabilityScore(expert: ExpertProfile) {
  switch (expert.availability_status) {
    case 'available':
      return {
        score: 100,
        reason: '즉시 시작 가능',
        concern: null
      }
    case 'busy':
      return {
        score: 70,
        reason: '일정 조율 후 시작 가능',
        concern: null
      }
    case 'unavailable':
      return {
        score: 20,
        reason: null,
        concern: '현재 업무 불가능'
      }
    default:
      return {
        score: 60,
        reason: null,
        concern: '가용성 불명확'
      }
  }
}

function calculateReputationScore(expert: ExpertProfile) {
  const reasons: string[] = []
  const concerns: string[] = []
  let score = 50 // baseline

  // Rating factor
  if (expert.rating_average >= 4.5) {
    score += 25
    reasons.push(`높은 평점 (${expert.rating_average.toFixed(1)}점)`)
  } else if (expert.rating_average >= 4.0) {
    score += 15
    reasons.push(`좋은 평점 (${expert.rating_average.toFixed(1)}점)`)
  } else if (expert.rating_average < 3.5 && expert.total_reviews > 5) {
    score -= 20
    concerns.push(`낮은 평점 (${expert.rating_average.toFixed(1)}점)`)
  }

  // Review count factor
  if (expert.total_reviews >= 20) {
    score += 15
    reasons.push(`많은 리뷰 (${expert.total_reviews}개)`)
  } else if (expert.total_reviews >= 5) {
    score += 10
  } else if (expert.total_reviews < 3) {
    concerns.push('리뷰 부족')
  }

  // Completion rate factor
  if (expert.completion_rate >= 95) {
    score += 10
    reasons.push(`높은 완료율 (${expert.completion_rate}%)`)
  } else if (expert.completion_rate < 80) {
    score -= 15
    concerns.push(`낮은 완료율 (${expert.completion_rate}%)`)
  }

  // Response time factor
  if (expert.response_time_hours <= 12) {
    score += 10
    reasons.push('빠른 응답 (12시간 이내)')
  } else if (expert.response_time_hours > 48) {
    score -= 10
    concerns.push(`느린 응답 (${expert.response_time_hours}시간)`)
  }

  return {
    score: Math.min(Math.max(score, 0), 100),
    reason: reasons.length > 0 ? reasons.join(', ') : null,
    concern: concerns.length > 0 ? concerns.join(', ') : null
  }
}

/**
 * Find experts matching a campaign with intelligent ranking
 */
export async function findMatchingExperts(
  campaignId: string, 
  limit: number = 20
): Promise<MatchScore[]> {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    // Get potential experts with pre-filtering
    let expertsQuery = supabase
      .from('expert_search_view')
      .select('*')
      .gte('profile_completeness', 50)
      .eq('is_available', true)

    // Apply budget filter if specified
    if (campaign.budget_max && campaign.budget_max > 0) {
      const maxHourlyRate = Math.ceil(campaign.budget_max / 40) // Assume 40 hours
      expertsQuery = expertsQuery.lte('hourly_rate', maxHourlyRate * 1.5) // 50% buffer
    }

    const { data: experts, error: expertsError } = await expertsQuery
      .order('rating_average', { ascending: false })
      .limit(100) // Pre-filter to top 100 candidates

    if (expertsError) {
      throw new Error('Failed to fetch experts')
    }

    if (!experts || experts.length === 0) {
      return []
    }

    // Calculate match scores for all experts
    const matchScores: MatchScore[] = []
    
    for (const expert of experts) {
      const matchScore = await calculateMatchScore(expert, campaign)
      matchScores.push(matchScore)
    }

    // Sort by score and return top matches
    return matchScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

  } catch (error) {
    console.error('Error finding matching experts:', error)
    return []
  }
}

/**
 * Get personalized expert recommendations for an organization
 */
export async function getPersonalizedRecommendations(
  organizationId: string,
  limit: number = 10
): Promise<{
  trending: ExpertProfile[]
  quickResponders: ExpertProfile[]
  budgetFriendly: ExpertProfile[]
  topRated: ExpertProfile[]
}> {
  try {
    // Get organization's past preferences and campaigns
    const { data: orgCampaigns } = await supabase
      .from('campaigns')
      .select('type, category, keywords, budget_min, budget_max')
      .eq('organization_id', organizationId)
      .limit(10)

    // Extract common keywords and preferences
    const commonKeywords = new Set<string>()
    const budgetRanges: number[] = []
    
    orgCampaigns?.forEach(campaign => {
      campaign.keywords?.forEach(keyword => commonKeywords.add(keyword.toLowerCase()))
      if (campaign.budget_max) budgetRanges.push(campaign.budget_max)
    })

    const avgBudget = budgetRanges.length > 0 
      ? budgetRanges.reduce((a, b) => a + b, 0) / budgetRanges.length 
      : null

    // Base query for all recommendations
    const baseQuery = supabase
      .from('expert_search_view')
      .select('*')
      .gte('profile_completeness', 60)
      .eq('is_available', true)

    // Trending experts (new profiles with high engagement)
    const { data: trending } = await baseQuery
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .gte('rating_average', 4.0)
      .order('total_reviews', { ascending: false })
      .limit(limit)

    // Quick responders
    const { data: quickResponders } = await baseQuery
      .lte('response_time_hours', 12)
      .gte('rating_average', 4.0)
      .order('response_time_hours', { ascending: true })
      .limit(limit)

    // Budget-friendly experts
    let budgetQuery = baseQuery.gte('rating_average', 4.0)
    if (avgBudget) {
      const maxHourlyRate = avgBudget / 40 // Assume 40 hours
      budgetQuery = budgetQuery.lte('hourly_rate', maxHourlyRate)
    }
    
    const { data: budgetFriendly } = await budgetQuery
      .order('hourly_rate', { ascending: true })
      .limit(limit)

    // Top rated experts in relevant fields
    let topRatedQuery = baseQuery.gte('rating_average', 4.5)
    if (commonKeywords.size > 0) {
      const keywordArray = Array.from(commonKeywords)
      topRatedQuery = topRatedQuery.overlaps('skills', keywordArray)
    }

    const { data: topRated } = await topRatedQuery
      .order('rating_average', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(limit)

    return {
      trending: trending || [],
      quickResponders: quickResponders || [],
      budgetFriendly: budgetFriendly || [],
      topRated: topRated || []
    }

  } catch (error) {
    console.error('Error getting personalized recommendations:', error)
    return {
      trending: [],
      quickResponders: [],
      budgetFriendly: [],
      topRated: []
    }
  }
}

// Helper functions

function getRelatedSkillMatches(expertSkills: string[], campaignKeywords: string[]): string[] {
  const skillRelations: Record<string, string[]> = {
    'react': ['javascript', 'frontend', 'web'],
    'vue': ['javascript', 'frontend', 'web'],
    'angular': ['javascript', 'typescript', 'frontend'],
    'nodejs': ['javascript', 'backend', 'api'],
    'python': ['django', 'flask', 'data', 'ml'],
    'java': ['spring', 'backend', 'enterprise'],
    'ui': ['ux', '디자인', 'figma'],
    'ux': ['ui', '사용성', '디자인'],
    '마케팅': ['디지털마케팅', 'seo', '광고'],
    'ai': ['ml', 'machine learning', 'data'],
    'blockchain': ['web3', 'crypto', 'smart contract']
  }

  const matches: string[] = []
  
  campaignKeywords.forEach(keyword => {
    const relatedSkills = skillRelations[keyword] || []
    if (relatedSkills.some(related => 
      expertSkills.some(skill => skill.includes(related))
    )) {
      matches.push(keyword)
    }
  })

  return matches
}

function checkSameMetropolitanArea(location1: string, location2: string): boolean {
  const metropolitanAreas: Record<string, string[]> = {
    '수도권': ['서울', '경기', '인천'],
    '부산권': ['부산', '울산', '경남'],
    '대구권': ['대구', '경북'],
    '광주권': ['광주', '전남'],
    '대전권': ['대전', '세종', '충남'],
    '강원권': ['강원', '춘천', '원주']
  }

  for (const [area, cities] of Object.entries(metropolitanAreas)) {
    const inArea1 = cities.some(city => location1.includes(city))
    const inArea2 = cities.some(city => location2.includes(city))
    
    if (inArea1 && inArea2) {
      return true
    }
  }

  return false
}

/**
 * Log matching activity for analytics
 */
export async function logMatchingActivity(
  organizationId: string,
  campaignId: string,
  expertId: string,
  action: 'view' | 'contact' | 'shortlist',
  matchScore?: number
) {
  try {
    await supabase.from('matching_logs').insert({
      organization_id: organizationId,
      campaign_id: campaignId,
      expert_id: expertId,
      action,
      match_score: matchScore,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log matching activity:', error)
  }
}
import { z } from 'zod'
import { userRoleSchema } from './auth'

export const localAccountSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  unitId: z.string(),
})

export type LocalAccount = z.infer<typeof localAccountSchema>

export const incidentPrioritySchema = z.enum(['low', 'medium', 'high'])
export const incidentCategorySchema = z.enum(['noise', 'pets', 'rules', 'other'])
export const incidentStatusSchema = z.enum([
  'open',
  'acknowledged',
  'in_progress',
  'resolved',
])

export const incidentVoteSchema = z.object({
  userId: z.string(),
  value: z.union([z.literal(1), z.literal(-1)]),
  votedAt: z.string(),
})

export const guardActionSchema = z.object({
  at: z.string(),
  note: z.string().optional(),
  photoUrl: z.string().optional(),
})

export const incidentSchema = z.object({
  id: z.string(),
  unitNumber: z.string().optional(),
  title: z.string(),
  description: z.string(),
  category: incidentCategorySchema,
  priority: incidentPrioritySchema,
  createdAt: z.string(),
  createdByUserId: z.string(),
  status: incidentStatusSchema,
  acknowledgedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  supportScore: z.number(),
  votes: z.array(incidentVoteSchema),
  guardActions: z.array(guardActionSchema),
})

export type Incident = z.infer<typeof incidentSchema>

export const qrPassTypeSchema = z.enum(['single_use', 'time_window'])
export const qrPassStatusSchema = z.enum(['active', 'used', 'expired', 'revoked'])

export const qrPassSchema = z.object({
  id: z.string(),
  label: z.string(),
  unitId: z.string(),
  createdByUserId: z.string(),
  visitorName: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  maxPersons: z.number().int().positive().optional(),
  accessMessage: z.string().optional(),
  type: qrPassTypeSchema,
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  visitorPhotoUrl: z.string().optional(),
  status: qrPassStatusSchema,
  qrValue: z.string(),
  displayCode: z.string(),
})

export type QrPass = z.infer<typeof qrPassSchema>

export const reservationStatusSchema = z.enum(['active', 'cancelled'])

export const reservationSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  amenity: z.string(),
  reservationDate: z.string(),
  fee: z.number().int().nonnegative(),
  status: reservationStatusSchema,
  createdAt: z.string(),
  createdByUserId: z.string(),
})

export type Reservation = z.infer<typeof reservationSchema>

export const parkingReportStatusSchema = z.enum([
  'open',
  'owner_notified',
  'tow_truck_notified',
])
export const parkingReportTypeSchema = z.enum(['own_spot', 'visitor_spot'])

export const parkingReportSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  parkingSpot: z.string(),
  reportType: parkingReportTypeSchema,
  visitorParkingSpot: z.string().optional(),
  description: z.string(),
  photoUrl: z.string(),
  status: parkingReportStatusSchema,
  createdAt: z.string(),
  createdByUserId: z.string(),
  guardNote: z.string().optional(),
  updatedAt: z.string().optional(),
  handledByGuardUserId: z.string().optional(),
})

export type ParkingReport = z.infer<typeof parkingReportSchema>

export const pollOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
})

export const pollVoteSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  optionId: z.string(),
  votedAt: z.string(),
})

export const pollSchema = z.object({
  id: z.string(),
  title: z.string(),
  options: z.array(pollOptionSchema).min(2),
  votes: z.array(pollVoteSchema),
  createdAt: z.string(),
  endsAt: z.string().optional(),
  endedAt: z.string().optional(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type Poll = z.infer<typeof pollSchema>

export const petSocialChoiceSchema = z.enum(['yes', 'no', 'depends'])
export const petEnergyLevelSchema = z.enum(['chill', 'balanced', 'zoomies', 'low', 'medium', 'high'])
export const petFriendlinessSchema = z.enum(['shy', 'neutral', 'friendly'])
export const petIndependenceSchema = z.enum(['independent', 'balanced', 'clingy'])
export const petAffectionLevelSchema = z.enum(['low', 'medium', 'high'])
export const petTrainingProgressSchema = z.enum(['yes', 'no', 'in_progress'])
export const petCrateTrainingSchema = z.enum(['yes', 'no', 'unknown'])
export const petRecallSchema = z.enum(['reliable', 'partial', 'no'])
export const petVaccinationSchema = z.enum(['up_to_date', 'partial', 'no'])
export const petSpeciesSchema = z.enum(['dog', 'cat', 'other'])
export const petSizeSchema = z.enum(['xs', 's', 'm', 'l', 'xl'])
export const petGenderSchema = z.enum(['female', 'male', 'other'])
export const petPlaydatePreferenceSchema = z.enum(['yes', 'no', 'selective'])
export const petGroomingNeedSchema = z.enum(['low', 'medium', 'high'])

export const petBehaviorTraitSchema = z.enum([
  'playful',
  'calm',
  'protective',
  'curious',
  'anxious',
  'stubborn',
  'gentle',
  'vocal',
  'alert',
  'lazy',
])

export const petKnownCommandSchema = z.enum([
  'sit',
  'stay',
  'come',
  'down',
  'heel',
  'leave_it',
  'drop_it',
])

export const petPrefersSchema = z.enum([
  'small_dogs',
  'large_dogs',
  'calm_pets',
  'energetic_pets',
])

export const petAvailableForSchema = z.enum([
  'playdates',
  'breeding',
  'adoption',
  'training_buddies',
  'walk_groups',
])

export const petPersonalityHighlightSchema = z.enum([
  'loves_people',
  'high_energy',
  'great_with_kids',
  'needs_training',
  'independent',
])

export const petProfileSchema = z.object({
  socialWithHumans: petSocialChoiceSchema.default('depends'),
  socialWithChildren: petSocialChoiceSchema.default('depends'),
  socialWithDogs: petSocialChoiceSchema.default('depends'),
  socialWithCats: petSocialChoiceSchema.default('depends'),
  socialWithOtherAnimals: petSocialChoiceSchema.default('depends'),
  energyLevel: petEnergyLevelSchema.default('balanced'),
  friendliness: petFriendlinessSchema.default('neutral'),
  independence: petIndependenceSchema.default('balanced'),
  affectionLevel: petAffectionLevelSchema.default('medium'),
  behaviorTraits: petBehaviorTraitSchema.array().default([]),
  vaccinated: petVaccinationSchema.default('up_to_date'),
  neuteredOrSpayed: z.boolean().optional(),
  specialNeeds: z.boolean().default(false),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  groomingNeeds: petGroomingNeedSchema.default('medium'),
  houseTrained: petTrainingProgressSchema.default('in_progress'),
  crateTrained: petCrateTrainingSchema.default('unknown'),
  leashTrained: petTrainingProgressSchema.default('in_progress'),
  recallTrained: petRecallSchema.default('partial'),
  commandsKnown: petKnownCommandSchema.array().default([]),
  species: petSpeciesSchema.default('dog'),
  breed: z.string().optional(),
  age: z.string().optional(),
  size: petSizeSchema.default('m'),
  weight: z.string().optional(),
  gender: petGenderSchema.optional(),
  birthday: z.string().optional(),
  locationCity: z.string().optional(),
  availabilityNote: z.string().optional(),
  personalityHighlights: petPersonalityHighlightSchema.array().max(5).default([]),
  likesPlaydates: petPlaydatePreferenceSchema.default('selective'),
  prefers: petPrefersSchema.array().default([]),
  availableFor: petAvailableForSchema.array().default([]),
})

export type PetProfile = z.infer<typeof petProfileSchema>

export const petPostSchema = z.object({
  id: z.string(),
  petName: z.string(),
  photoUrl: z.string(),
  comments: z.string(),
  profile: petProfileSchema.optional(),
  createdAt: z.string(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type PetPost = z.infer<typeof petPostSchema>

export const petPostCommentSchema = z.object({
  id: z.string(),
  petPostId: z.string(),
  message: z.string(),
  createdAt: z.string(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type PetPostComment = z.infer<typeof petPostCommentSchema>

export const appCommentTargetTypeSchema = z.enum(['poll', 'marketplace_post', 'directory_entry'])

export const appCommentSchema = z.object({
  id: z.string(),
  targetType: appCommentTargetTypeSchema,
  targetId: z.string(),
  message: z.string(),
  createdAt: z.string(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type AppComment = z.infer<typeof appCommentSchema>

export const maintenanceReportTypeSchema = z.enum([
  'plumbing',
  'electrical',
  'lighting',
  'common_area',
  'security',
  'other',
])

export const maintenanceReportStatusSchema = z.enum(['open', 'in_progress', 'resolved'])

export const maintenanceReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  reportType: maintenanceReportTypeSchema,
  photoUrl: z.string().optional(),
  unitNumber: z.string(),
  status: maintenanceReportStatusSchema,
  createdAt: z.string(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type MaintenanceReport = z.infer<typeof maintenanceReportSchema>

export const directoryServiceTypeSchema = z.enum([
  'plumbing',
  'electrical',
  'carpentry',
  'painting',
  'gardening',
  'cleaning',
  'security',
  'internet',
  'appliances',
  'other',
])

export const directoryEntrySchema = z.object({
  id: z.string(),
  providerName: z.string(),
  contactName: z.string().optional(),
  contactPhone: z.string(),
  contactWhatsapp: z.string().optional(),
  notes: z.string().optional(),
  serviceTypes: directoryServiceTypeSchema.array().min(1),
  otherServiceType: z.string().optional(),
  photoUrl: z.string().optional(),
  createdAt: z.string(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type DirectoryEntry = z.infer<typeof directoryEntrySchema>

export const marketplaceConditionSchema = z.enum(['new', 'used'])
export const marketplaceStatusSchema = z.enum(['active', 'sold'])

export const marketplacePostSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  photoUrl: z.string(),
  condition: marketplaceConditionSchema,
  status: marketplaceStatusSchema,
  contactMessage: z.string().optional(),
  whatsappNumber: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdByUserId: z.string(),
  createdByName: z.string(),
})

export type MarketplacePost = z.infer<typeof marketplacePostSchema>

export const moderationTargetTypeSchema = z.enum(['incident', 'pet_post', 'marketplace_post'])
export const moderationReportStatusSchema = z.enum(['open', 'dismissed', 'actioned'])

export const moderationReportSchema = z.object({
  id: z.string(),
  targetType: moderationTargetTypeSchema,
  targetId: z.string(),
  reason: z.string(),
  details: z.string().optional(),
  status: moderationReportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  createdByUserId: z.string(),
  createdByName: z.string(),
  handledByUserId: z.string().optional(),
  handledNote: z.string().optional(),
})

export type ModerationReport = z.infer<typeof moderationReportSchema>

export const auditLogSchema = z.object({
  id: z.string(),
  at: z.string(),
  actorUserId: z.string(),
  action: z.string(),
  targetId: z.string(),
  result: z.string(),
  note: z.string().optional(),
})

export type AuditLogEntry = z.infer<typeof auditLogSchema>

export const offlineQueueSchema = z.object({
  id: z.string(),
  at: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  guardUserId: z.string(),
  synced: z.boolean(),
})

export type OfflineQueueEvent = z.infer<typeof offlineQueueSchema>

export const appSessionSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: userRoleSchema,
  unitNumber: z.string().optional(),
})

export type AppSession = z.infer<typeof appSessionSchema>

export const LOCAL_ACCOUNTS: LocalAccount[] = [
  {
    id: 'acc-resident-1',
    fullName: 'Ana Lopez',
    email: 'ana.lopez@privadareforma.mx',
    role: 'resident',
    unitId: '1141',
  },
  {
    id: 'acc-tenant-1',
    fullName: 'Juan Perez',
    email: 'juan.perez@privadareforma.mx',
    role: 'tenant',
    unitId: '1141',
  },
  {
    id: 'acc-guard-1',
    fullName: 'Carlos Mena',
    email: 'carlos.mena@privadareforma.mx',
    role: 'guard',
    unitId: 'Caseta Norte',
  },
  {
    id: 'acc-board-1',
    fullName: 'Marco Ortega',
    email: 'marco.ortega@privadareforma.mx',
    role: 'board',
    unitId: '1142',
  },
]

export const LOCAL_QR_PASSES: QrPass[] = []

export const LOCAL_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    title: 'Luz fundida en acceso peatonal',
    description: 'Zona oscura frente a pluma peatonal.',
    category: 'rules',
    priority: 'high',
    createdAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-resident-1',
    status: 'open',
    supportScore: 1,
    votes: [{ userId: 'acc-resident-1', value: 1, votedAt: new Date().toISOString() }],
    guardActions: [],
  },
  {
    id: 'inc-2',
    title: 'Ruido excesivo en alberca',
    description: 'Musica alta despues del horario permitido.',
    category: 'noise',
    priority: 'medium',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-tenant-1',
    status: 'open',
    supportScore: 0,
    votes: [],
    guardActions: [],
  },
  {
    id: 'inc-3',
    title: 'Jovenes sin adultos en la alberca en la noche',
    description:
      'Se detecta grupo de menores sin supervision adulta despues del horario permitido.',
    category: 'rules',
    priority: 'high',
    createdAt: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-resident-1',
    status: 'open',
    supportScore: 5,
    votes: [
      { userId: 'u-1', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-2', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-3', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-4', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-5', value: 1, votedAt: new Date().toISOString() },
    ],
    guardActions: [],
  },
  {
    id: 'inc-4',
    title: 'Fiesta con ruido extremo y vidrios en area comun',
    description:
      'Vecinos reportan riesgo inmediato por botellas rotas y musica alta pasada medianoche.',
    category: 'noise',
    priority: 'high',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    createdByUserId: 'acc-tenant-1',
    status: 'open',
    supportScore: 10,
    votes: [
      { userId: 'u-11', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-12', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-13', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-14', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-15', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-16', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-17', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-18', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-19', value: 1, votedAt: new Date().toISOString() },
      { userId: 'u-20', value: 1, votedAt: new Date().toISOString() },
    ],
    guardActions: [],
  },
]

export const LOCAL_AUDIT_LOG: AuditLogEntry[] = []
export const LOCAL_OFFLINE_QUEUE: OfflineQueueEvent[] = []
export const LOCAL_RESERVATIONS: Reservation[] = [
  {
    id: 'res-20260307-1122',
    unitNumber: '11-22',
    amenity: 'Terraza',
    reservationDate: '2026-03-07',
    fee: 5000,
    status: 'active',
    createdAt: new Date('2026-02-20T12:00:00-08:00').toISOString(),
    createdByUserId: 'acc-resident-1',
  },
]
export const LOCAL_PARKING_REPORTS: ParkingReport[] = []
export const LOCAL_POLLS: Poll[] = []
export const LOCAL_PET_POSTS: PetPost[] = []
export const LOCAL_PET_POST_COMMENTS: PetPostComment[] = []
export const LOCAL_APP_COMMENTS: AppComment[] = []
export const LOCAL_MARKETPLACE_POSTS: MarketplacePost[] = []
export const LOCAL_MODERATION_REPORTS: ModerationReport[] = []
export const LOCAL_MAINTENANCE_REPORTS: MaintenanceReport[] = []
export const LOCAL_DIRECTORY_ENTRIES: DirectoryEntry[] = []

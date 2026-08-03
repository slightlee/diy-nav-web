import { avatarService } from '../src/services.js'

try {
  await avatarService.ensureLibraryUploaded()
  console.log('Avatar library seeded successfully.')
} catch (error) {
  console.error('Failed to seed avatar library:', error)
  process.exitCode = 1
}

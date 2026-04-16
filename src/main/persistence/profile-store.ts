import { app } from 'electron'
import { join } from 'node:path'
import type { PetProfile } from '../../domain/life/types'
import { readJsonFile, writeJsonFile } from './store'

function getProfilePath(): string {
  return join(app.getPath('userData'), 'profile.json')
}

export async function loadProfile(): Promise<PetProfile | null> {
  return readJsonFile<PetProfile>(getProfilePath())
}

export async function saveProfile(profile: PetProfile): Promise<void> {
  await writeJsonFile(getProfilePath(), profile)
}

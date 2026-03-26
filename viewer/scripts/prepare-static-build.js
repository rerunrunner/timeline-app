#!/usr/bin/env node
/**
 * Prepares a static viewer build from exported data files instead of a live editor API.
 * This is the production/CI path; local dev should keep using the editor API directly.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const viewerDir = path.resolve(__dirname, '..')
const publicDir = path.join(viewerDir, 'public')
const datasetOutPath = path.join(publicDir, 'dataset.json')
const imagesOutDir = path.join(publicDir, 'images', 'screenshots')

function resolveDataDir() {
  if (!process.env.TIMELINE_DATA_DIR) {
    throw new Error('TIMELINE_DATA_DIR is required')
  }

  return path.resolve(process.env.TIMELINE_DATA_DIR)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function clearDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true })
  ensureDir(dirPath)
}

function getExportJsonPath(exportDir) {
  if (!fs.existsSync(exportDir)) {
    throw new Error(`Export directory does not exist: ${exportDir}`)
  }

  const candidates = fs
    .readdirSync(exportDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const fullPath = path.join(exportDir, entry.name)
      return {
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  if (candidates.length === 0) {
    throw new Error(`No exported JSON files found in: ${exportDir}`)
  }

  return candidates[0].fullPath
}

function copyDataset(exportFilePath) {
  ensureDir(publicDir)
  fs.copyFileSync(exportFilePath, datasetOutPath)
  console.log(`Copied dataset: ${exportFilePath} -> ${datasetOutPath}`)
}

function copyImages(imagesDir) {
  clearDir(imagesOutDir)

  if (!fs.existsSync(imagesDir)) {
    console.log(`Images directory not found, leaving static images empty: ${imagesDir}`)
    return
  }

  const imageFiles = fs
    .readdirSync(imagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())

  for (const entry of imageFiles) {
    const source = path.join(imagesDir, entry.name)
    const destination = path.join(imagesOutDir, entry.name)
    fs.copyFileSync(source, destination)
  }

  console.log(`Copied ${imageFiles.length} image(s): ${imagesDir} -> ${imagesOutDir}`)
}

function main() {
  try {
    const dataDir = resolveDataDir()
    const exportDir = path.join(dataDir, 'export')
    const imagesDir = path.join(dataDir, 'images')

    const exportFilePath = getExportJsonPath(exportDir)
    copyDataset(exportFilePath)
    copyImages(imagesDir)
  } catch (err) {
    console.error('Failed to prepare static viewer build:', err.message)
    console.error('Set TIMELINE_DATA_DIR to the root of your data repo.')
    process.exit(1)
  }
}

main()

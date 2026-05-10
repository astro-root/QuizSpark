import { Router } from 'express'
import { gameManager } from '../game/GameManager'

const router = Router()

router.get('/public', (_req, res) => {
  res.json(gameManager.getPublicRooms())
})

export default router

'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, Download, FileText, AlertCircle, CheckCircle, 
  AlertTriangle, Loader2, Copy, Check 
} from 'lucide-react'
import { toast } from 'sonner'
import { parseYDKFile, validateDeck, fetchCardsFromIds, generateYDKContent } from '@/lib/deck-import-export'
import type { Card } from '@/lib/types'

interface DeckImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (mainDeck: Card[], extraDeck: Card[], sideDeck: Card[]) => void
}

export function DeckImportDialog({ isOpen, onClose, onImport }: DeckImportDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [ydkContent, setYdkContent] = useState('')
  const [importedCards, setImportedCards] = useState<{
    main: Card[]
    extra: Card[]
    side: Card[]
  } | null>(null)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    errors: string[]
    warnings: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const content = await file.text()
    setYdkContent(content)
    await processYDK(content)
  }

  const processYDK = async (content: string) => {
    setIsLoading(true)
    try {
      const parsed = await parseYDKFile(content)
      
      // Fetch card data for all IDs
      const [mainCards, extraCards, sideCards] = await Promise.all([
        fetchCardsFromIds(parsed.main),
        fetchCardsFromIds(parsed.extra),
        fetchCardsFromIds(parsed.side),
      ])

      const imported = {
        main: mainCards,
        extra: extraCards,
        side: sideCards,
      }
      setImportedCards(imported)

      // Validate the deck
      const validation = await validateDeck({
        mainDeck: mainCards,
        extraDeck: extraCards,
        sideDeck: sideCards,
      })
      setValidationResult(validation)
    } catch (error) {
      toast.error('Failed to parse YDK file')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = () => {
    if (importedCards) {
      onImport(importedCards.main, importedCards.extra, importedCards.side)
      handleClose()
      toast.success('Deck imported successfully!')
    }
  }

  const handleClose = () => {
    setYdkContent('')
    setImportedCards(null)
    setValidationResult(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Deck
          </DialogTitle>
          <DialogDescription>
            Import a deck from a YDK file (YGOPro format)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Select YDK File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ydk"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Manual paste */}
          <div className="space-y-2">
            <Label>Or paste YDK content:</Label>
            <Textarea
              placeholder="#main&#10;12345678&#10;23456789&#10;...&#10;#extra&#10;...&#10;!side&#10;..."
              value={ydkContent}
              onChange={(e) => setYdkContent(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => processYDK(ydkContent)}
              disabled={!ydkContent || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Process
            </Button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Fetching card data...</span>
            </div>
          )}

          {/* Imported deck preview */}
          {importedCards && !isLoading && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="outline">Main: {importedCards.main.length}</Badge>
                <Badge variant="outline">Extra: {importedCards.extra.length}</Badge>
                <Badge variant="outline">Side: {importedCards.side.length}</Badge>
              </div>

              {/* Validation Results */}
              {validationResult && (
                <div className="space-y-2">
                  {validationResult.valid ? (
                    <Alert className="border-green-500 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-500">
                        Deck is valid!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Deck has {validationResult.errors.length} error(s)
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.errors.length > 0 && (
                    <ScrollArea className="h-24">
                      <div className="space-y-1">
                        {validationResult.errors.map((error, i) => (
                          <p key={i} className="text-sm text-red-400">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {error}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <ScrollArea className="h-24">
                      <div className="space-y-1">
                        {validationResult.warnings.map((warning, i) => (
                          <p key={i} className="text-sm text-yellow-400">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {warning}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importedCards || isLoading}
            >
              Import Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Export Dialog
interface DeckExportDialogProps {
  isOpen: boolean
  onClose: () => void
  mainDeck: { card_id: number; name: string }[]
  extraDeck: { card_id: number; name: string }[]
  sideDeck?: { card_id: number; name: string }[]
  deckName: string
}

export function DeckExportDialog({
  isOpen,
  onClose,
  mainDeck,
  extraDeck,
  sideDeck,
  deckName,
}: DeckExportDialogProps) {
  const [ydkContent, setYdkContent] = useState('')
  const [copied, setCopied] = useState(false)

  const generateExport = async () => {
    const content = await generateYDKContent({
      mainDeck,
      extraDeck,
      sideDeck: sideDeck || [],
    })
    setYdkContent(content)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ydkContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  const handleDownload = () => {
    const blob = new Blob([ydkContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deckName.replace(/[^a-z0-9]/gi, '_')}.ydk`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Deck exported!')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Deck
          </DialogTitle>
          <DialogDescription>
            Export &quot;{deckName}&quot; as a YDK file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="outline">Main: {mainDeck.length}</Badge>
            <Badge variant="outline">Extra: {extraDeck.length}</Badge>
            {sideDeck && <Badge variant="outline">Side: {sideDeck.length}</Badge>}
          </div>

          {!ydkContent ? (
            <Button onClick={generateExport} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Generate YDK
            </Button>
          ) : (
            <>
              <Textarea
                value={ydkContent}
                readOnly
                rows={10}
                className="font-mono text-sm"
              />

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download .ydk
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

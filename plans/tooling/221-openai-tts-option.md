# Plan 221: OpenAI TTS Option for Presentation Mode

**Status**: Proposed
**Category**: tooling
**Depends On**: 220 (Presentation Mode Viewer)

## Problem

The presentation mode uses the Web Speech API for narration, which has limitations:

- **Voice quality varies** by browser/OS (some sound robotic)
- **No consistency** across devices
- **Limited expressiveness** - monotone delivery
- **No voice selection** beyond browser defaults

Users who want higher-quality narration for demos or recordings have no option.

## Proposed Solution

Add an optional OpenAI TTS integration alongside the existing Web Speech API:

1. **Default**: Web Speech API (no API key required, works offline)
1. **Optional**: OpenAI TTS (requires user's API key, better quality)

User provides their own API key via localStorage settings panel - we never store or transmit it beyond the OpenAI API call.

## Technical Approach

### Voice Provider Abstraction

```typescript
interface VoiceProvider {
  speak(text: string): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}

class WebSpeechProvider implements VoiceProvider { ... }
class OpenAITTSProvider implements VoiceProvider { ... }
```

### OpenAI TTS Implementation

```typescript
class OpenAITTSProvider implements VoiceProvider {
  private apiKey: string;
  private audio: HTMLAudioElement | null = null;

  async speak(text: string): Promise<void> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',          // or 'tts-1-hd' for higher quality
        voice: 'alloy',          // alloy, echo, fable, onyx, nova, shimmer
        input: text,
        speed: 1.0,
      }),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    this.audio = new Audio(url);

    return new Promise((resolve, reject) => {
      this.audio!.onended = () => resolve();
      this.audio!.onerror = reject;
      this.audio!.play();
    });
  }

  cancel(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
```

### Settings Storage

```typescript
// localStorage keys
const VOICE_PROVIDER_KEY = 'presentation-voice-provider';  // 'web-speech' | 'openai'
const OPENAI_API_KEY = 'presentation-openai-key';          // encrypted? or plain
const OPENAI_VOICE_KEY = 'presentation-openai-voice';      // 'alloy' | 'nova' | etc.
```

### Settings Panel UI

Add a collapsible settings section in presentation mode:

```
┌─────────────────────────────────────────┐
│ ⚙️ Voice Settings                       │
├─────────────────────────────────────────┤
│ Provider: [Web Speech ▼]                │
│                                         │
│ ── OpenAI Settings ──                   │
│ API Key: [••••••••••••] [Test]          │
│ Voice:   [Nova ▼]                       │
│ Model:   [tts-1 ▼]                      │
│                                         │
│ ⚠️ Key stored in browser only           │
└─────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Voice Provider Abstraction

1. [ ] Create `stories/voice/VoiceProvider.ts` interface
1. [ ] Extract current Web Speech logic into `WebSpeechProvider.ts`
1. [ ] Update App.tsx to use provider abstraction
1. [ ] Verify existing functionality unchanged

### Phase 2: OpenAI Provider

1. [ ] Create `OpenAITTSProvider.ts` implementing VoiceProvider
1. [ ] Handle audio blob → playback flow
1. [ ] Add error handling (invalid key, rate limits, network)
1. [ ] Add loading state while fetching audio

### Phase 3: Settings UI

1. [ ] Create `VoiceSettings.tsx` component
1. [ ] Add provider dropdown (Web Speech / OpenAI)
1. [ ] Add API key input with show/hide toggle
1. [ ] Add "Test" button to verify key works
1. [ ] Add voice selection dropdown for OpenAI
1. [ ] Persist settings to localStorage

### Phase 4: Integration

1. [ ] Wire settings to provider selection in App.tsx
1. [ ] Add keyboard shortcut to open settings (e.g., 'V')
1. [ ] Show current provider in status bar
1. [ ] Graceful fallback if OpenAI fails mid-playback

## Files Affected

- `stories/App.tsx` - Use voice provider abstraction
- `stories/voice/VoiceProvider.ts` - New: interface definition
- `stories/voice/WebSpeechProvider.ts` - New: extracted current logic
- `stories/voice/OpenAITTSProvider.ts` - New: OpenAI implementation
- `stories/components/VoiceSettings.tsx` - New: settings panel
- `stories/App.css` - Settings panel styles

## Security Considerations

1. **API key storage** - localStorage is accessible to any JS on the page. For this dev tool context, this is acceptable. Document the risk.

1. **Key visibility** - Use `type="password"` input, require explicit "show" action

1. **No server relay** - Call OpenAI directly from browser, key never touches our infrastructure

1. **CORS** - OpenAI API allows browser requests with proper headers

## Cost Awareness

OpenAI TTS pricing (as of 2024):
- `tts-1`: $0.015 per 1K characters
- `tts-1-hd`: $0.030 per 1K characters

A typical MDX page might have ~2000 characters of narration = ~$0.03-0.06 per full page read.

Consider adding:
- Character count estimate in UI
- Warning before reading long sections
- Option to limit to current section only

## Testing

1. **Manual testing**:
   - Verify Web Speech still works without API key
   - Verify OpenAI works with valid key
   - Verify graceful failure with invalid key
   - Test mid-narration provider switch
   - Test across browsers (Chrome, Firefox, Safari)

1. **Unit tests**:
   - VoiceProvider interface contract
   - Settings persistence/retrieval
   - Error handling paths

## Open Questions

1. **Audio caching** - Cache generated audio blobs to avoid re-fetching same text? Could save costs but adds complexity.

1. **Streaming** - OpenAI supports streaming audio. Worth implementing for lower latency on long text?

1. **Voice preview** - Should settings panel play a sample of each voice before user commits?

1. **HD model** - Offer `tts-1-hd` as an option? 2x cost but noticeably better quality.

## Success Criteria

- [ ] Web Speech API remains default (no regression)
- [ ] Users can add OpenAI key and hear improved narration
- [ ] Key stored only in localStorage, never transmitted elsewhere
- [ ] Clear UI for switching providers
- [ ] Graceful degradation if OpenAI unavailable

# Reddit 홍보글

레딧은 광고 냄새가 나면 바로 내려가거나 삭제됩니다. 그래서 모두 **"만든 사람이 직접 쓰는 이야기"**로 썼고,
첫 줄이나 끝에 **개발자 본인이라는 것**을 밝혔습니다 (대부분 서브레딧 규칙).

## 올리기 전에

1. **각 서브레딧 규칙(사이드바 / About) 먼저 읽기.** 홍보 글은 특정 요일만 허용하거나 플레어(Flair)를 꼭 달라는 곳이 많습니다.
2. **새 계정이면 바로 올리지 않기.** 며칠 동안 다른 글에 댓글을 달아 카르마를 조금 쌓은 뒤 올립니다. 새 계정 + 링크 글은 자동 삭제되는 경우가 많습니다.
3. **같은 글을 여러 곳에 동시에 올리지 않기.** 하루에 한 곳, 서브레딧마다 문장을 조금씩 바꿔서.
4. 링크는 **본문 맨 끝 한 번만.** 서브레딧이 본문 링크를 막으면 댓글로 답니다.
5. 올리는 시간: 미국 오전 (한국 시간 **밤 10시 ~ 새벽 1시**), 화~목.
6. 올린 뒤 **2~3시간은 댓글에 바로 답장.** 처음 몇 시간의 반응이 노출을 결정합니다.

App Store 링크: `https://apps.apple.com/app/id6820913429`
랜딩 페이지: `https://hwanify.github.io/neck-posture/`

---

## 1. r/SideProject (가장 추천, 홍보 허용)

**Title**
```
I tilt my head to the right all day without noticing, so I built an app that uses my AirPods to tell me
```

**Body**
```
I'm the developer, so take this with that in mind.

For years I had no idea my head was always leaning slightly to the right. I only noticed it in photos, and by then it was a habit I couldn't feel.

AirPods Pro / Max / 3rd gen and later have a head-tracking sensor (the one spatial audio uses), and iOS lets apps read it. So I built Plumb:

- It measures how far your head tilts left or right, relative to your own neutral position
- If you stay tilted for a couple of seconds, a short sound plays in the ear on the side you're leaning toward
- Straighten up and it goes quiet
- Works with the screen off or while you're in other apps, and mixes with your music
- Nodding forward/back doesn't count as tilt, so reading or looking down at a desk is fine

No camera, no account, and nothing leaves your phone. It's free.

The thing I didn't expect: getting the cue in the ear you're leaning toward is enough. You don't need to look at anything, you just straighten up.

Things I'd love feedback on:
- Is the default (5°, 2 seconds) too sensitive or not sensitive enough for you?
- Would you rather have the sound in the opposite ear ("come back this way")? That's a setting now, but I'm not sure which should be the default.

App Store: https://apps.apple.com/app/id6820913429
```

---

## 2. r/reactnative 또는 r/expo (개발자 이야기, 링크보다 과정 중심)

**Title**
```
I shipped an iOS app with Expo without owning a Mac. Here's the setup.
```

**Body**
```
I only have an iPhone, no Mac. I wanted to see if I could still ship a native iOS app, and it worked, so here's what the setup looked like in case it helps someone.

The app reads the AirPods head-tracking sensor (CMHeadphoneMotionManager) and plays a sound in one ear when your head stays tilted. That needs native code, so Expo Go alone wasn't enough.

What I used:
- A local Expo module in Swift for the headphone motion + audio cue + Live Activity. Written and edited without Xcode, built in the cloud.
- EAS Build for the first builds. When I ran out of free builds for the month, I moved to `eas build --local` on a GitHub Actions macOS runner (free for public repos), then `eas submit` straight to TestFlight / App Store Connect.
- Expo Go + a fallback to the phone's own DeviceMotion for quick JS testing, so the app still runs when the native module isn't there.
- EAS Update for JS-only fixes. One gotcha: runtimeVersion follows the app version, so an update published from a repo that's already at 1.0.2 won't reach users on 1.0.1. I added a workflow input to publish for an older version.
- All the detection logic is plain TypeScript with unit tests, so I could test most of it without a device.

App Review rejected the first submission for two things:
- Guideline 5.2.5: I had an Apple product name in the app name. Renamed.
- Guideline 2.5.4: they asked why it uses background audio. I explained it plays posture cues while the screen is off, only during a session the user starts. Approved after that.

Happy to answer questions about any part of it.

(The app is Plumb, free, if you want to see the result: https://apps.apple.com/app/id6820913429)
```

---

## 3. r/AirPods (규칙 확인 필수, 홍보 제한이 있을 수 있음)

**Title**
```
Made a free app that uses the AirPods head-tracking sensor to catch your head tilting to one side
```

**Body**
```
Developer here. Most people only know the head-tracking sensor from spatial audio, but apps can read it too.

I built Plumb because I always lean my head slightly to the right without noticing. It reads the tilt from your AirPods and plays a short sound in the ear you're leaning toward if you stay tilted for a couple of seconds. Straighten up and it stops.

- Works with AirPods Pro (all), AirPods Max, AirPods 3rd gen and later (not 2nd gen, no sensor)
- Screen can be off, and it mixes with whatever you're listening to
- No camera, no account, data stays on the phone
- Free

Curious if anyone else here uses the head tracking for anything besides spatial audio.

https://apps.apple.com/app/id6820913429
```

---

## 4. r/iOSapps (홍보 플레어 달기)

**Title**
```
[Free] Plumb: your AirPods tell you when your head tilts to one side
```

**Body**
```
I'm the developer.

Plumb uses the motion sensor in your AirPods to measure how far your head leans left or right. Stay tilted for a couple of seconds and a soft sound plays in that ear. Straighten up and it goes quiet.

- No camera, works with the screen off
- Adjustable angle, hold time and alert interval
- Lock Screen / Dynamic Island while measuring
- Weekly history
- No account, no ads, nothing leaves your phone
- 10 languages

Needs AirPods with head tracking (Pro, Max, or 3rd gen and later).

https://apps.apple.com/app/id6820913429

Feedback very welcome, especially on the default sensitivity.
```

---

## 피해야 할 곳 / 표현

- **r/Posture, r/neckpain, r/scoliosis** 등 건강 서브레딧: 홍보가 대부분 금지이고, 앱이 치료에 도움이 되는 것처럼 보이면 신고됩니다. 굳이 간다면 홍보 글이 아니라 질문 댓글에 경험으로만 짧게 답하기.
- "fixes your posture", "cures neck pain", "doctor recommended" 같은 효과 표현은 쓰지 않습니다.

## 자주 달릴 댓글 답장 (영어)

- **Android?** → `iOS only for now, since it relies on the AirPods head-tracking API. I'd like to look into Android, but I don't want to promise anything yet.`
- **Battery?** → `It keeps a session running in the background, so it uses some battery while measuring. It only runs during a session you start, and stops when you end it.`
- **Why not just use a camera app?** → `I wanted something that works while I'm not looking at the screen, and I didn't want a camera pointed at me all day.`
- **Does it work with AirPods 2?** → `Unfortunately no, the 2nd gen doesn't have the head-tracking sensor. It needs AirPods Pro, Max, or 3rd gen and later.`
- **Is this a medical thing?** → `No, it's not a medical device. It just tells you when you're tilted so you can notice it.`

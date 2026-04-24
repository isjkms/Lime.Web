# Murate — 음악 평론 플랫폼

10점 만점 + 한 줄 평(최대 100자)으로 음악과 앨범을 평가하는 실시간 리뷰 서비스.

## 스택

- **Next.js 15 (App Router, RSC)** + TypeScript + Tailwind
- **Supabase** (Postgres + Auth + Realtime)
- **Spotify Web API** (검색/메타데이터) + **Web Playback SDK** (프리미엄 사용자 풀재생)
- **Zustand** (전역 플레이어 상태 — localStorage 영속)

## 주요 기능

| 요구사항 | 구현 |
|---|---|
| 소셜 로그인 필수 | Supabase Auth (Google, Kakao). 네이버는 Custom OAuth 설정 필요 |
| 비로그인도 평가 열람 | 모든 목록/상세 페이지 공개 |
| 10점 평가 + 100자 한줄평 | `reviews` 테이블 CHECK 제약 + UI 제한 |
| 음악/앨범 재생 | 30초 미리듣기(기본) / Spotify 연결 시 풀재생 |
| 전역 플레이어 유지 | `PlayerBar` 전역 배치 + Zustand persist |
| 중복 음악/앨범 방지 | `spotify_id` UNIQUE + `(title,artist)` UNIQUE 인덱스 |
| 포인트 시스템 | 평가 작성 +2P, 삭제 -3P (DB 트리거로 원자적 처리) |
| 실시간 업데이트 | Supabase Realtime (`reviews`, `review_reactions` 구독) |
| 앨범/음악 분리 평가 | `target_type`으로 구분 |
| 좋아요/싫어요 | `review_reactions`. 좋아요만 공개, 싫어요는 숨김(내부 신호) |
| 대시보드 | 최근 평가 / 일·월·년 베스트 음악·앨범 |

## 셋업

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수

`.env.local.example`를 `.env.local`로 복사 후 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
3. **Authentication → Providers**:
   - Google: OAuth 2.0 Client ID 발급 후 등록
   - Kakao: Supabase는 공식 지원. Kakao Developers에서 앱 등록 후 Client ID/Secret 등록
   - Naver: Custom OAuth Provider로 직접 구성 (Supabase가 기본 프로바이더로 제공하지 않음)
4. Redirect URL: `https://<your-project>.supabase.co/auth/v1/callback`

### 4. Spotify 설정 (선택이지만 권장)

1. [developer.spotify.com](https://developer.spotify.com) Dashboard에서 앱 생성
2. Redirect URI 등록: `http://localhost:3000/api/spotify/callback`
3. Client ID / Secret을 `.env.local`에 입력

> Spotify 설정 없이도 사이트는 작동합니다. 다만 검색/미리듣기/풀재생이 비활성화되고, 사용자는 **수동 입력**으로만 곡을 등록할 수 있습니다.

### 5. 실행

```bash
npm run dev
```

## 아키텍처 노트

- **Realtime**: `ReviewList`가 해당 대상의 `reviews` + 전역 `review_reactions` 변경을 구독합니다. 다른 사용자의 평가가 실시간으로 삽입/삭제되며, 라우터 `refresh()`로 통계(평균 점수)도 갱신됩니다.
- **포인트 안전성**: 평가 삭제 시 포인트 검사와 차감을 DB 트리거(`BEFORE DELETE`)에서 처리하여 레이스 컨디션을 피합니다. 포인트 부족 시 예외 발생 → 삭제 롤백.
- **전역 플레이어**: 루트 레이아웃에 상주. 페이지 이동 시에도 재생 유지. Zustand persist로 새로고침 후에도 현재 곡 복원(재생 위치는 Spotify SDK/Audio에서 다시 로드).
- **Spotify 재생 우선순위**: 사용자가 Spotify에 연결되어 있고 곡에 `spotify_id`가 있으면 Web Playback SDK로 풀재생. 아니면 `preview_url` 30초 재생.
- **중복 방지**: Spotify ID가 있으면 UNIQUE. 수동 입력 곡은 `(lower(title), lower(artist))` 부분 UNIQUE 인덱스로 방어.

## 경로

```
src/
├── app/
│   ├── page.tsx                       # 대시보드
│   ├── login/
│   ├── tracks/{,new,[id]}
│   ├── albums/{,new,[id]}
│   ├── auth/{callback,signout}
│   └── api/spotify/{search,login,callback,user-token,logout}
├── components/
│   ├── Header, PlayerBar, PlayButton
│   ├── TrackCard, AlbumCard
│   ├── ReviewForm, ReviewList
│   └── SpotifyConnect
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── spotify.ts
│   └── queries.ts
├── store/player.ts
└── middleware.ts
```

## 확장 아이디어

- 사용자 프로필 페이지 + 나의 평가 목록
- 아티스트 페이지 (Spotify 아티스트 ID 기반)
- 팔로우 기능 + 피드
- 월간 큐레이션 에디터 픽

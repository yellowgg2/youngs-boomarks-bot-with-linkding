# Young's bookmarks bot with Linkding

그 동안 북마크 툴로 [Linkding](https://github.com/sissbruecker/linkding)을 많이 애용해왔다.

써오면서 불편한 점은 브라우져를 열어서, 로그인을 하고 북마크를 검색하는 일이 귀찮아졌다.

특히 스마트 폰에서 더욱 귀찮았다. 그래서 만들었다. 북마크 봇!!!!

## 설치

- `LINKDING`을 먼저 설치 한다. 자세한 설치 방법은 [Linkding](https://github.com/sissbruecker/linkding)에서 볼 수 있다.
- `.env`를 자신의 정보로 변경한다.
- `docker-compose up -d --build` 로 설치

## 환경 변수 설명 (.env)

| key                    | 설명                                                         | 예시                                    |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `PUID`                 | host UID (`id -u`로 확인)                                    | 1000                                    |
| `GUID`                 | host GID (`id -g`로 확인)                                    | 1000                                    |
| `BOT_API_TOKEN`        | 봇 토큰                                                      |                                         |
| `ADMIN_USERNAME`       | 텔레그램 아이디 - 관리자 용 (보통 설치하는 사람 아이디 입력) |                                         |
| `ADMIN_DESC`           | 관리자 설명                                                  | 수퍼맨                                  |
| `ADMIN_CHATID`         | 특정 명령이나 에러 발생 시 메세지를 보낼 chat id             | 11223344                                |
| `LINKDING_URL`         | Linkding의 설치 주소 (url or IP)                             | http://192.168.1.2:9090                 |
| `LINKDING_ADMIN_TOKEN` | Linkding admin계정의 토큰                                    | Linkding의 settings에서 확인 할 수 있음 |
| `BOT_LANG`             | 언어 설정 (ko: 한국어, en: 영어)                             | ko or en                                |

## 사용법

- 북마크 추가
  - URL을 보내면 봇이 태그를 추가하라고 응답을 보낸다
    - 태그를 추가하라는 메세지가 오면, space로 구분하여 단어를 보내면 태그들과 함께 해당 URL을 Linkding에 등록해준다
    - `예시) 한국 텔레그램`
- 북마크 검색
  - 아무 단어나 봇에게 보내면, 해당 단어가 포함된 북마크를 검색해줌 (여러 단어를 검색할 때는 space로 구분)
    - `예시) 한국 텔레그램`
  - `#`으로 시작하는 태그를 봇에게 보내면, 해당 태그가 포함된 북마크를 검색해줌 (여러 태그를 검색할 때는 space로 구분)
    - `예시) #한국 #텔레그램`
- 북마크 수정
  - 북마크를 검색 후 해당 메세지를 `reply`를 하여 다음 중 하나의 단어를 입력한다. (`e, edit, 수정`)
- 북마크 삭제
  - 북마크를 검색 후 해당 메세지를 `reply`를 하여 다음 중 하나의 단어를 입력한다. (`d, delete, 삭제`)

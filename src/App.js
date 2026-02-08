/*
[나쁜하루쓰레기통] React & Matter.js 구현
[필독 지침: 반드시 모든 설명과 주석은 한국어로만 작성하세요. 중국어나 다른 언어는 절대 사용하지 마세요.]
*/

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import './App.css';
import TextInput from './components/TextInput';
import EmptyButton from './components/EmptyButton';
import EncouragementMessage from './components/EncouragementMessage';

const { Engine, Render, Runner, Bodies, World, Events } = Matter;

function App() {
  // 물리 세계 렌더링을 위한 DOM 요소 참조
  const sceneRef = useRef(null);
  // Matter.js 주요 인스턴스들을 담을 참조
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const floorRef = useRef(null);
  // 동적으로 생성된 텍스트 객체들을 추적하기 위한 참조
  const textBodiesRef = useRef([]);

  // 사용자 입력을 위한 상태
  const [inputValue, setInputValue] = useState('');
  // "비워졌습니다" 메시지 표시를 위한 상태
  const [clearMessage, setClearMessage] = useState('');
  const [isMessageVisible, setIsMessageVisible] = useState(false); // 메시지 가시성 상태 추가

  // Matter.js 물리 세계의 너비를 TextInput 너비에 맞춥니다. (여기서 정의)
  const matterWorldWidth = 1000; // TextInput의 너비와 동일

  // 텍스트 너비/높이 측정을 위한 헬퍼 함수 (캔버스 사용)
  const measureTextDimensions = (text, fontSize, fontWeight, maxWidth) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontWeight} ${fontSize}px sans-serif`;

    let currentLine = '';
    let lines = [];
    let currentWidth = 0;
    const lineHeight = fontSize * 1.5; // 대략적인 줄 높이
    let totalHeight = lineHeight;
    let actualWidth = 0; // 실제 텍스트가 차지하는 최대 너비

    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i] + ' ';
      const testWidth = context.measureText(testLine).width;

      if (testLine.length > maxWidth && i > 0) { // testWidth 대신 testLine.length를 사용하여 줄바꿈 조건 수정
        lines.push(currentLine.trim());
        actualWidth = Math.max(actualWidth, context.measureText(currentLine.trim()).width);
        currentLine = words[i] + ' ';
        totalHeight += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine.trim());
    actualWidth = Math.max(actualWidth, context.measureText(currentLine.trim()).width);

    // 텍스트가 한 줄일 경우 실제 너비를 사용, 여러 줄일 경우 maxWidth를 사용
    const textRenderWidth = lines.length > 1 ? maxWidth : actualWidth;

    return {
      width: textRenderWidth,
      height: totalHeight,
      lineCount: lines.length,
    };
  };

  // 컴포넌트 마운트 시 한 번만 실행되는 메인 로직
  useEffect(() => {
    // 1. 물리 엔진 생성
    const engine = Engine.create();
    engineRef.current = engine;

    // 2. 렌더러 생성
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#F0F0F0', // Matter.js 렌더러 배경색을 밝은 색으로 변경
        wireframes: false, // 와이어프레임 모드 끄기
      },
    });
    renderRef.current = render;

    // 벽과 바닥 생성 함수
    const createWalls = () => {
      const height = window.innerHeight;
      const wallThickness = 50;
      
      const worldLeft = (window.innerWidth - matterWorldWidth) / 2;
      const worldRight = worldLeft + matterWorldWidth;

      // 바닥 (나중에 제거/생성을 위해 참조 저장)
      floorRef.current = Bodies.rectangle(window.innerWidth / 2, height + wallThickness / 2, matterWorldWidth + wallThickness * 2, wallThickness, { isStatic: true, render: { visible: false } }); // 바닥은 창 중앙에 matterWorldWidth 만큼

      return [
        floorRef.current,
        // 왼쪽 벽
        Bodies.rectangle(worldLeft - wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
        // 오른쪽 벽
        Bodies.rectangle(worldRight + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
      ];
    };

    let walls = createWalls();
    World.add(engine.world, walls);

    // 3. 물리 엔진 실행기 생성 및 실행
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);

    // 4. 텍스트 렌더링 로직 (매 프레임마다 실행)
    Events.on(render, 'afterRender', () => {
      const context = render.context;
      context.save(); // 컨텍스트 상태 저장

      const bodiesToRemoveFromWorld = [];

      // 물리 세계의 모든 객체 순회
      Matter.Composite.allBodies(engine.world).forEach(body => {
        // 커스텀 속성으로 텍스트 객체인지 확인
        if (body.customText) {
          context.save(); // 개별 객체 렌더링 상태 저장
          context.translate(body.position.x, body.position.y);
          context.rotate(body.angle);
          
          let currentOpacity = 1; // 기본값
          if (body.customText.isFadingIn) {
            const now = Date.now();
            const fadeProgress = Math.min(1, (now - body.customText.fadeInStartTime) / body.customText.fadeInDuration);
            currentOpacity = fadeProgress; // 투명도가 0에서 1로 이동
            if (fadeProgress >= 1) {
              body.customText.isFadingIn = false; // 페이드인 완료
            }
          } else if (body.customText.isFading) {
            const now = Date.now();
            const fadeProgress = Math.min(1, (now - body.customText.fadeStartTime) / body.customText.fadeDuration);
            currentOpacity = 1 - fadeProgress; // 투명도가 1에서 0으로 이동
            if (fadeProgress >= 1) {
              bodiesToRemoveFromWorld.push(body);
            }
          }
          
          // 텍스트 스타일 설정 (텍스트 색상은 페이딩에 따라 조정)
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = `rgba(51, 51, 51, ${currentOpacity})`; // 글자 색상 및 투명도 적용 (text-color에 맞춤)
          
          let currentFontSize = parseInt(body.customText.font, 10);
          context.font = `${body.customText.fontWeight || '800'} ${currentFontSize}px sans-serif`;
          
          // 텍스트 그리기 (다중 라인 처리)
          const maxTextWidthForBody = 980; // TextInput의 고정 너비 (1000px - 패딩 20px)
          const words = body.customText.content.split(' ');
          let currentLine = '';
          let lines = [];
          
          const lineHeight = currentFontSize * 1.5;

          for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i] + ' ';
            // 텍스트 너비가 maxTextWidthForBody를 초과하면 줄 바꿈
            if (context.measureText(testLine).width > maxTextWidthForBody && i > 0) {
              lines.push(currentLine.trim());
              currentLine = words[i] + ' ';
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());

          const startY = - (lines.length - 1) * lineHeight / 2; // 중앙 정렬을 위한 시작 Y 위치
          lines.forEach((line, index) => {
            context.fillText(line, 0, startY + index * lineHeight);
          });
          
          context.restore(); // 개별 객체 렌더링 상태 복원
        }
      });
      
      // 페이딩이 완료된 객체들을 물리 세계에서 제거
      bodiesToRemoveFromWorld.forEach(body => {
        World.remove(engine.world, body);
        textBodiesRef.current = textBodiesRef.current.filter(b => b.id !== body.id);
      });
      context.restore(); // 컨텍스트 상태 복원
    });

    // 5. 창 크기 조절 대응 로직
    const handleResize = () => {
      // 렌더러와 캔버스 크기 업데이트
      render.bounds.max.x = window.innerWidth;
      render.bounds.max.y = window.innerHeight;
      render.options.width = window.innerWidth;
      render.options.height = window.innerHeight;
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;

      // 기존 벽 제거 및 새 크기에 맞는 벽 재생성
      World.remove(engine.world, walls);
      walls = createWalls();
      World.add(engine.world, walls);
    };

    window.addEventListener('resize', handleResize);

    // 컴포넌트 언마운트 시 정리 작업
    return () => {
      Runner.stop(runner);
      Render.stop(render);
      World.clear(engine.world, false);
      Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
      
      window.removeEventListener('resize', handleResize);
    };
  }, []); // 빈 배열: 최초 렌더링 시에만 실행

  // 텍스트 입력 후 Enter 키를 눌렀을 때 실행
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();

      const engine = engineRef.current;
      if (!engine) return;

      const inputText = inputValue.trim();
      const fontSize = 18;
      const fontWeight = '800'; // Matter.js 텍스트 렌더링에 사용할 폰트 두께
      const maxTextWidthForBody = 980; // TextInput의 고정 너비 (1000px - 패딩 20px)

      const { width: calculatedWidth, height: calculatedHeight } = measureTextDimensions(inputText, fontSize, fontWeight, maxTextWidthForBody);

      // 시각적 카드에 추가할 패딩
      const cardPadding = 0; 
      const bodyWidthWithPadding = calculatedWidth + cardPadding * 2;
      const bodyHeightWithPadding = calculatedHeight + cardPadding * 2;

      // 텍스트 길이에 따라 물리 객체 너비 추정 (정확하지 않아도 됨)
      const textWidth = bodyWidthWithPadding;
      const textHeight = bodyHeightWithPadding;

      // 화면 상단 랜덤 x 위치에서 객체 생성 (인풋 박스 아래에서 나오도록 조정)
      const worldLeft = (window.innerWidth - matterWorldWidth) / 2;
      const x = Math.random() * matterWorldWidth + worldLeft; // Matter.js 월드 너비 내에서 x 위치 랜덤화
      const inputAreaBottomY = window.innerHeight * 0.12; // input box의 대략적인 하단 Y Y위치
      const y = inputAreaBottomY;

      const body = Bodies.rectangle(x, y, textWidth, textHeight, {
        restitution: 0.1, // 약간의 탄성 (0.1로 되돌림)
        friction: 0.5,    // 마찰 (0.5로 되돌림)
        render: { visible: false }, // 실제 사각형은 보이지 않게 처리
      });

      // 커스텀 속성에 텍스트 정보와 폰트 스타일 저장
      body.customText = {
        content: inputText,
        font: `${fontSize}px sans-serif`, // 순수 폰트 크기만 저장
        fontWeight: fontWeight,          // 폰트 두께는 별도 저장
        isFading: false,                 // 페이딩 아웃 상태 초기화
        isFadingIn: true,                // 페이딩 인 상태 활성화
        fadeInStartTime: Date.now(),     // 페이딩 인 시작 시간
        fadeInDuration: 500,             // 페이딩 인 지속 시간 (0.5초)
      };

      World.add(engine.world, body);
      textBodiesRef.current.push(body); // 생성된 객체 추적 목록에 추가
      setInputValue(''); // 입력창 비우기
    }
  };

  // '전부 비우기' 버튼 클릭 시 실행
  const handleClear = () => {
    const engine = engineRef.current;
    if (!engine || textBodiesRef.current.length === 0) return;

    // 1. 모든 텍스트 객체에 페이딩 시작 플래그 설정 및 시작 시간 기록
    const fadeDuration = 1000; // 1초 동안 페이드 아웃
    const now = Date.now(); // Date.Date()에서 Date.now()로 수정
    textBodiesRef.current.forEach(body => {
      if (body.customText) {
        body.customText.isFading = true;
        body.customText.fadeStartTime = now;
        body.customText.fadeDuration = fadeDuration;
        body.collisionFilter.mask = 0; // 페이딩 중 다른 객체와 충돌 방지
        body.customText.isFadingIn = false; // 페이딩 아웃 시작 시 페이딩 인 중지
      }
    });

    // 2. 바닥 제거하여 객체들이 자유롭게 떨어지게 함 (충돌 방지된 상태)
    World.remove(engine.world, floorRef.current);

    // 3. 일정 시간 후, 객체들을 물리 세계에서 완전히 제거
    // 이 시간은 페이드 아웃 애니메이션 시간 + 객체들이 충분히 떨어질 시간
    setTimeout(() => {
      // isFading 플래그가 있는 모든 객체들을 대상으로 World에서 제거 시도
      const bodiesToAttemptRemoval = textBodiesRef.current.filter(body => body.customText && body.customText.isFading);
      World.remove(engine.world, bodiesToAttemptRemoval); // 페이딩 완료된 객체들을 물리 세계에서 제거 시도

      // 실제로 제거된 객체들을 제외하고 textBodiesRef.current 갱신
      // Matter.js의 World.remove는 객체가 이미 제거되었으면 아무것도 하지 않으므로,
      // textBodiesRef.current 갱신 시에는 isFading이 아닌 객체들만 남김
      textBodiesRef.current = textBodiesRef.current.filter(body => !(body.customText && body.customText.isFading));

      // 4. 새 바닥을 다시 생성하여 추가
      const width = window.innerWidth;
      const height = window.innerHeight;
      const wallThickness = 50;
      floorRef.current = Bodies.rectangle(window.innerWidth / 2, height + wallThickness / 2, matterWorldWidth + wallThickness * 2, wallThickness, { isStatic: true, render: { visible: false } }); // 바닥은 창 중앙에 matterWorldWidth 만큼
      World.add(engine.world, floorRef.current);
      
      // 5. "비워졌습니다" 메시지 표시 (이미 이전에 업데이트됨)
    const encouragementMessages = [
      '수고했어요, 오늘은 여기서 털어버려요.',
      '당신의 하루는 충분히 빛나요.',
      '이제 편안한 밤 되세요.',
      '내일은 분명 더 좋은 날이 될 거예요!',
      '모든 걱정은 날려버리고, 새로운 시작을 준비해요.'
    ];
    const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    setClearMessage(randomMessage);

    // setIsMessageVisible(true)는 이제 EncouragementMessage가 내부적으로 관리
    setIsMessageVisible(true); 

    // Duration for message display, including fade-out
    const messageDisplayDuration = 5000; // 5 seconds total
    const fadeOutDuration = 1000; // Updated to match CSS transition for smooth fade-out (1s)

    // Start fade-out animation after (displayDuration - fadeOutDuration)
    setTimeout(() => {
      setIsMessageVisible(false); // Trigger fade-out (opacity 0)
    }, messageDisplayDuration - fadeOutDuration);

    // Completely clear the message from DOM after fade-out completes
    setTimeout(() => {
      setClearMessage(''); // Clear message text (component returns null)
    }, messageDisplayDuration);
    }, fadeDuration + 500); // 페이드 아웃 시간 + 0.5초 버퍼
  };

  return (
    <div className="App">
      <div className="input-controls">
        <TextInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <EmptyButton onClick={handleClear} />
      </div>
      <EncouragementMessage message={clearMessage} isVisible={isMessageVisible} />
      
      {/* Matter.js 렌더러가 이 div를 사용합니다 */}
      <div ref={sceneRef} className="scene" />
      
      <div className="ad-space">
        비운 자리에 평온함을 채우세요. [광고]
      </div>
    </div>
  );
}

export default App;
import { useEffect, useRef, useState } from 'react'

/**
 * 星月夜开屏欢迎页
 * 画作上 4 个热区（星空/城市/月亮/大树）点击播放对应音频，互斥播放；
 * 悬停时不做高亮，而是让对应区域"活"过来：漩涡转动/气球升空/月亮闪烁/柏树摇曳。
 * 点击"进入"淡出并卸载。x/y/w/h 为相对画作的百分比，素材就位后可按构图微调。
 */
const IMG = '/images/starry-night.jpg'

// 坐标按真迹构图（1920x1532）校准：星空=中央漩涡，城市=中下部村庄，月亮=右上弦月，大树=左侧柏树
const HOTSPOTS = [
  { key: 'stars', name: '星空', src: '/music/stars.mp3', x: 32, y: 13, w: 28, h: 30 },
  { key: 'city', name: '城市', src: '/music/city.mp3', x: 44, y: 70, w: 32, h: 26 },
  { key: 'moon', name: '月亮', src: '/music/moon.mp3', x: 81, y: 5, w: 17, h: 20 },
  { key: 'tree', name: '大树', src: '/music/tree.mp3', x: 13, y: 6, w: 20, h: 90 }
]

// 动效层蒙版（羽化椭圆，边缘渐隐以遮住图层与底图的接缝）
const MASK_SWIRL = 'radial-gradient(ellipse 24% 20% at 46% 30%, black 42%, transparent 74%)'
const MASK_MOON = 'radial-gradient(ellipse 9% 8% at 89% 14%, black 40%, transparent 75%)'
const MASK_TREE = 'radial-gradient(ellipse 15% 44% at 15% 54%, black 45%, transparent 78%)'

// 气球：x/y 起飞点（相对画作 %），s 球体尺寸 px，c 颜色，d 延迟 s，dur 周期 s，k 关键帧
const BALLOONS = [
  { x: 52, y: 80, s: 18, c: '#d98f4e', d: 0, dur: 8.5, k: 'fxBalloonA' },
  { x: 58, y: 83, s: 15, c: '#b5544a', d: 1.8, dur: 9.2, k: 'fxBalloonB' },
  { x: 64, y: 79, s: 19, c: '#5b8a86', d: 3.4, dur: 8.8, k: 'fxBalloonA' },
  { x: 69, y: 82, s: 14, c: '#e3c878', d: 0.9, dur: 9.6, k: 'fxBalloonB' },
  { x: 48, y: 84, s: 16, c: '#6b7fae', d: 4.6, dur: 9.0, k: 'fxBalloonB' }
]

const FX_CSS = `
@keyframes fxSwirl{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes fxMoonFlicker{0%,100%{filter:brightness(1)}50%{filter:brightness(1.65)}}
@keyframes fxSway{0%{transform:rotate(0deg)}25%{transform:rotate(-1.7deg)}50%{transform:rotate(0deg)}75%{transform:rotate(1.3deg)}100%{transform:rotate(0deg)}}
@keyframes fxBalloonA{0%{transform:translate(0,14px) scale(.45);opacity:0}12%{opacity:1}30%{transform:translate(10px,-34px) scale(1)}55%{transform:translate(-8px,-72px)}80%{transform:translate(9px,-108px);opacity:.9}100%{transform:translate(-5px,-140px) scale(1.06);opacity:0}}
@keyframes fxBalloonB{0%{transform:translate(0,14px) scale(.45);opacity:0}12%{opacity:1}30%{transform:translate(-9px,-36px) scale(1)}55%{transform:translate(8px,-74px)}80%{transform:translate(-7px,-110px);opacity:.9}100%{transform:translate(5px,-142px) scale(1.06);opacity:0}}
@media (prefers-reduced-motion: reduce){.fx-anim{animation:none !important}}
`

export default function WelcomeSplash() {
  // pre: 未淡入；in: 已淡入；out: 淡出中；done: 已卸载
  const [phase, setPhase] = useState('pre')
  // 当前悬停的热区 key（驱动对应动效层启动）
  const [active, setActive] = useState(null)
  const audioRefs = useRef({})
  const activeRef = useRef(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('in'))
    return () => {
      cancelAnimationFrame(raf)
      Object.values(audioRefs.current).forEach(el => el && el.pause())
    }
  }, [])

  const toggle = h => {
    const cur = audioRefs.current[h.key]
    if (!cur) return
    if (activeRef.current && activeRef.current !== cur) {
      activeRef.current.pause()
      activeRef.current.currentTime = 0
    }
    if (cur.paused) {
      cur.play().catch(() => {})
      activeRef.current = cur
    } else {
      cur.pause()
      cur.currentTime = 0
      activeRef.current = null
    }
  }

  const enter = () => {
    Object.values(audioRefs.current).forEach(el => {
      if (el) {
        el.pause()
        el.currentTime = 0
      }
    })
    activeRef.current = null
    setPhase('out')
    setTimeout(() => setPhase('done'), 750)
  }

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0b1026] transition-all duration-700 ${
        phase === 'in' ? 'opacity-100' : phase === 'out' ? 'opacity-0 scale-105' : 'opacity-0'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 30%, rgba(46,64,120,0.45) 0%, rgba(11,16,38,0) 60%)'
      }}>
      <style dangerouslySetInnerHTML={{ __html: FX_CSS }} />

      {/* 画作与热区 */}
      <div className='relative inline-block rounded shadow-2xl'>
        <img
          src={IMG}
          alt='梵高 星月夜'
          draggable='false'
          className='block max-h-[62vh] sm:max-h-[72vh] max-w-[92vw] object-contain rounded select-none'
        />

        {/* 动效层：悬停对应热区时启动（pointer-events-none 不挡点击） */}
        <div className='pointer-events-none absolute inset-0 overflow-hidden rounded'>
          {/* 星空：漩涡缓慢转动（复制图层绕漩涡中心旋转，蒙版羽化遮缝） */}
          <div
            className='absolute inset-0'
            style={{ WebkitMaskImage: MASK_SWIRL, maskImage: MASK_SWIRL }}>
            <img
              src={IMG}
              alt=''
              draggable='false'
              className='fx-anim block h-full w-full object-contain'
              style={{
                transformOrigin: '46% 30%',
                animation: 'fxSwirl 45s linear infinite',
                animationPlayState: active === 'stars' ? 'running' : 'paused'
              }}
            />
          </div>

          {/* 月亮：亮度闪烁 + 光晕 */}
          <div
            className='absolute inset-0'
            style={{ WebkitMaskImage: MASK_MOON, maskImage: MASK_MOON }}>
            <img
              src={IMG}
              alt=''
              draggable='false'
              className='fx-anim block h-full w-full object-contain'
              style={{
                animation: 'fxMoonFlicker 2.6s ease-in-out infinite',
                animationPlayState: active === 'moon' ? 'running' : 'paused'
              }}
            />
          </div>
          <div
            className='absolute inset-0 transition-opacity duration-700'
            style={{
              opacity: active === 'moon' ? 1 : 0,
              mixBlendMode: 'screen',
              background:
                'radial-gradient(ellipse 16% 14% at 89% 14%, rgba(255,236,170,0.55) 0%, rgba(255,236,170,0) 70%)'
            }}
          />

          {/* 城市：气球升空（容器淡入淡出，气球常驻循环保证出现时已在半空） */}
          <div
            className='absolute inset-0 transition-opacity duration-700'
            style={{ opacity: active === 'city' ? 1 : 0 }}>
            {BALLOONS.map((b, i) => (
              <span
                key={i}
                className='fx-anim absolute block'
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  animation: `${b.k} ${b.dur}s ease-in-out ${b.d}s infinite backwards`
                }}>
                <span
                  className='absolute'
                  style={{
                    left: -0.5,
                    top: b.s * 0.575 + 4,
                    width: 1,
                    height: b.s * 1.5,
                    background: 'rgba(240,230,205,0.5)'
                  }}
                />
                <span
                  className='absolute'
                  style={{
                    left: -3,
                    top: b.s * 0.575,
                    borderLeft: '3px solid transparent',
                    borderRight: '3px solid transparent',
                    borderTop: `4px solid ${b.c}`
                  }}
                />
                <span
                  className='absolute rounded-full'
                  style={{
                    width: b.s,
                    height: b.s * 1.15,
                    marginLeft: -b.s / 2,
                    marginTop: -b.s * 0.575,
                    borderRadius: '50% 50% 50% 50% / 46% 46% 54% 54%',
                    background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 45%), ${b.c}`,
                    boxShadow: `0 0 10px ${b.c}66`
                  }}
                />
              </span>
            ))}
          </div>

          {/* 大树：柏树随风摇曳（复制图层绕树根摆动，蒙版羽化遮缝） */}
          <div
            className='absolute inset-0'
            style={{ WebkitMaskImage: MASK_TREE, maskImage: MASK_TREE }}>
            <img
              src={IMG}
              alt=''
              draggable='false'
              className='fx-anim block h-full w-full object-contain'
              style={{
                transformOrigin: '15% 92%',
                animation: 'fxSway 5.5s ease-in-out infinite',
                animationPlayState: active === 'tree' ? 'running' : 'paused'
              }}
            />
          </div>
        </div>

        {HOTSPOTS.map(h => (
          <button
            key={h.key}
            aria-label={h.name}
            onClick={() => toggle(h)}
            onPointerEnter={() => setActive(h.key)}
            onPointerLeave={() => setActive(null)}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
            className='group absolute rounded-full cursor-pointer'>
            <span className='pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-7 whitespace-nowrap rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-amber-200/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
              {h.name}
            </span>
          </button>
        ))}
      </div>

      {/* 标题与进入按钮 */}
      <div className='mt-8 flex flex-col items-center gap-5'>
        <p className='text-sm tracking-[0.3em] text-amber-100/70'>星 月 夜</p>
        <button
          onClick={enter}
          className='rounded-full border border-amber-200/40 px-10 py-3 text-sm tracking-[0.5em] text-amber-100 transition-all duration-300 hover:border-amber-200/80 hover:bg-amber-200/10'>
          进入
        </button>
      </div>

      {/* 音频 */}
      {HOTSPOTS.map(h => (
        <audio
          key={h.key}
          ref={el => (audioRefs.current[h.key] = el)}
          src={h.src}
          preload='auto'
        />
      ))}
    </div>
  )
}

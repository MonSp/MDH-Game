import { useState } from 'react';

interface SurveyPopupProps {
  onClose: () => void;
}

type SurveyStep = 'intro' | 'surprise' | 'feeling' | 'interest' | 'done';

export const SurveyPopup = ({ onClose }: SurveyPopupProps) => {
  const [step, setStep] = useState<SurveyStep>('intro');
  const [answers, setAnswers] = useState<{
    surprise: boolean | null;
    feeling: string;
    interest: number | null;
  }>({
    surprise: null,
    feeling: '',
    interest: null,
  });

  const handleFinish = () => {
    // Log survey results for later review
    console.log('[宿怨 Survey]', answers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        {step === 'intro' && (
          <div className="space-y-4">
            <h3 className="text-xl font-serif text-emerald-400">一个小问题</h3>
            <p className="text-zinc-300 leading-relaxed">
              感谢体验"宿怨"原型。在你离开之前，想问你三个简短的问题——这能帮助我们验证这个方向是否值得继续投入。
            </p>
            <button
              className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
              onClick={() => setStep('surprise')}
            >
              好的，开始
            </button>
          </div>
        )}

        {step === 'surprise' && (
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-emerald-400">Q1</h3>
            <p className="text-zinc-200">当李四再次出现时，你感到意外吗？</p>
            <div className="flex space-x-3">
              <button
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  answers.surprise === true
                    ? 'bg-emerald-700 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                onClick={() => setAnswers(a => ({ ...a, surprise: true }))}
              >
                意外
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  answers.surprise === false
                    ? 'bg-emerald-700 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                onClick={() => setAnswers(a => ({ ...a, surprise: false }))}
              >
                不意外
              </button>
            </div>
            {answers.surprise !== null && (
              <button
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors text-sm"
                onClick={() => setStep('feeling')}
              >
                下一题
              </button>
            )}
          </div>
        )}

        {step === 'feeling' && (
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-emerald-400">Q2</h3>
            <p className="text-zinc-200">当李四回来时，你是什么感受？（请自由描述）</p>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 min-h-[100px]"
              placeholder="比如：有点吃惊，觉得有意思，或者没什么感觉……"
              value={answers.feeling}
              onChange={e => setAnswers(a => ({ ...a, feeling: e.target.value }))}
            />
            <button
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors text-sm"
              onClick={() => setStep('interest')}
            >
              下一题
            </button>
          </div>
        )}

        {step === 'interest' && (
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-emerald-400">Q3</h3>
            <p className="text-zinc-200">如果有一款完整的游戏，其中NPC会记住你的选择并对你做出反应——你想玩吗？</p>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`w-12 h-12 rounded transition-colors ${
                    answers.interest === n
                      ? 'bg-emerald-700 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                  onClick={() => setAnswers(a => ({ ...a, interest: n }))}
                  title={n === 1 ? '完全不想' : n === 5 ? '非常想' : ''}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>完全不想</span>
              <span>非常想</span>
            </div>
            {answers.interest !== null && (
              <button
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors"
                onClick={() => setStep('done')}
              >
                提交
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-serif text-emerald-400">感谢你的反馈！</h3>
            <p className="text-zinc-300">
              你的回答将帮助我们决定是否在这个方向继续深入。
            </p>
            <button
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors"
              onClick={handleFinish}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

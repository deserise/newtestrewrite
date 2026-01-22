/**
 * 消息重写助手 - 交互逻辑
 * 功能：文本输入、风格选择、模拟AI重写、复制结果
 */

// ===== DOM 元素获取 =====
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');
const styleBtns = document.querySelectorAll('.style-btn');
const rewriteBtn = document.getElementById('rewriteBtn');
const resultSection = document.getElementById('resultSection');
const resultContent = document.getElementById('resultContent');
const styleBadge = document.getElementById('styleBadge');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const toast = document.getElementById('toast');

// ===== 状态管理 =====
let currentStyle = 'polite';
let isProcessing = false;

// 风格配置
const styleConfig = {
    polite: {
        icon: '🤝',
        name: '礼貌风格',
        templates: {
            催促: [
                '您好！希望这条消息不会打扰到您。我想跟进一下我们之前讨论的事项，不知道您是否有机会考虑过？如果您需要更多时间或信息，请随时告诉我。期待您方便时的回复，感谢您的时间！',
                '尊敬的客户，您好！冒昧打扰，想请问一下关于我们之前沟通的项目，您这边是否有最新的想法？完全理解您可能正在忙碌，当您方便时回复即可。感谢您的耐心！'
            ],
            拒绝: [
                '非常感谢您的提议和对我们的信任。经过仔细考虑，我们目前可能无法接受这个方案。希望这不会影响我们未来的合作机会。如果有其他方面可以协助的，请随时联系我。',
                '感谢您花时间准备这份方案。虽然这次未能达成合作，但我非常欣赏您的专业态度。期待未来有合适的机会能够一起合作。祝您一切顺利！'
            ],
            询问: [
                '您好！我是[姓名]，来自[公司]。了解到贵方在[领域]有很好的发展，想请教一下是否有合作的可能性？如果方便的话，我们可以安排一个简短的通话来详细讨论。期待您的回复！',
                '尊敬的[称呼]，您好！久仰贵方大名，想借此机会表达我们的合作意向。不知您近期是否方便抽出一些时间，让我们进一步交流？感谢您的考虑！'
            ],
            通知: [
                '您好！我想向您更新一下项目的最新进展。由于[原因]，我们需要对原定计划进行一些调整。我们正在积极解决相关问题，预计将在[时间]恢复正常进度。如有任何疑问，请随时与我联系。感谢您的理解与支持！',
                '尊敬的合作伙伴，您好！感谢您一直以来的信任与支持。我想告知您关于[事项]的一些变化。我们会确保对您的影响降到最低，并随时保持沟通。如需进一步了解，请联系我们。'
            ],
            默认: [
                '您好！感谢您的来信。关于您提到的内容，我已经仔细阅读。我会尽快处理相关事宜，并在有进展时第一时间通知您。如有任何问题，请随时与我联系。祝您工作顺利！',
                '您好！非常感谢您的联系。我会认真对待您提出的每一个问题，并尽我所能提供帮助。期待我们的顺利合作！'
            ]
        }
    },
    professional: {
        icon: '💼',
        name: '专业风格',
        templates: {
            催促: [
                '尊敬的[称呼]：\n\n关于[项目/事项]，我想确认一下后续安排。根据我们之前的沟通，请您在方便时提供反馈，以便我们推进下一步工作。\n\n如有任何需要协调的事项，请告知。\n\n此致\n敬礼',
                '您好：\n\n就我们之前讨论的[事项]，现跟进汇报进度。请您在[日期]前确认相关细节，以确保项目按计划进行。\n\n期待您的回复。'
            ],
            拒绝: [
                '尊敬的[称呼]：\n\n感谢您提供的方案。经过内部评估，我们认为该方案与当前业务需求存在差异，暂时无法推进合作。\n\n感谢您的理解，期待未来有合作机会。\n\n此致\n敬礼',
                '您好：\n\n经过审慎考虑，我们决定暂不采纳本次提议。这一决定基于当前业务优先级的考量，与方案本身的质量无关。\n\n感谢您的付出，期待后续合作。'
            ],
            询问: [
                '尊敬的[称呼]：\n\n本公司致力于[业务领域]，现有意与贵方探讨合作机会。\n\n如您对此有兴趣，请安排会议时间，我将详细介绍合作框架。\n\n期待您的回复。\n\n此致\n敬礼',
                '您好：\n\n了解到贵方在[领域]的专业优势，我方有意就[具体事项]寻求合作可能。请问您方便安排一次商务洽谈吗？\n\n静候佳音。'
            ],
            通知: [
                '尊敬的[称呼]：\n\n现通知您关于[项目/事项]的重要更新。\n\n由于[具体原因]，原定[内容]将调整为[新安排]。我们已采取相应措施以确保影响最小化。\n\n如有疑问，请与项目负责人联系。\n\n此致\n敬礼',
                '您好：\n\n兹通知：[事项]将于[日期]生效。相关细则详见附件。\n\n请各相关方知悉并做好相应准备。如需了解更多信息，请联系[联系人]。'
            ],
            默认: [
                '尊敬的[称呼]：\n\n感谢您的来函。关于您所提及的事项，我已知悉并将尽快处理。\n\n后续进展将及时通报。如有其他需求，请随时联系。\n\n此致\n敬礼',
                '您好：\n\n收到您的信息，感谢。我会在[时间范围]内处理相关事宜并给予回复。\n\n如有紧急事项，请通过[联系方式]与我取得联系。'
            ]
        }
    },
    friendly: {
        icon: '😊',
        name: '友好风格',
        templates: {
            催促: [
                '嗨！最近怎么样？😊 我就是想问问之前聊的那件事，你有什么想法吗？完全不着急啦，等你有空的时候回复我就好～',
                '哈喽～想起来我们之前聊的事情，不知道你考虑得怎么样了？有任何问题都可以跟我说哦，我们一起看看怎么解决！期待你的消息～ 🎉'
            ],
            拒绝: [
                '嗨！首先要说声谢谢你想到我！不过这次可能没办法参与，实在是有点分身乏术 😅 但这完全不影响我们以后的合作呀，下次有机会一定支持！',
                '谢谢你的邀请呀～虽然这次没办法答应，但真的很感谢你考虑到我！希望咱们以后还有很多机会可以一起搞事情 👍'
            ],
            询问: [
                '嗨，你好呀！😊 我是[姓名]～听说你们在做的事情超酷的！不知道我们有没有机会聊聊合作的事？随时方便联系我，期待认识你！',
                '哈喽～我关注你们的工作很久了，觉得真的很棒！想问问看有没有合作的可能？如果你感兴趣的话，我们可以约个时间聊聊，保证不会浪费你时间的！😄'
            ],
            通知: [
                '嗨！有个事情要告诉你～关于[事项]，我们需要做一些调整。放心，我们会处理好的！有什么问题随时找我聊，我们一起解决 💪',
                '亲爱的伙伴们～有个小更新要分享：[事项] 需要稍微改一下。别担心，一切都在掌控中！有问题随时问我哦，大家一起加油！🌟'
            ],
            默认: [
                '嗨！收到你的消息啦～谢谢你联系我！我会尽快看一下然后回复你的，有什么事情随时找我聊！祝你今天心情好好的 ☀️',
                '哈喽，你好呀！😊 谢谢你的消息，我马上就看～有任何需要帮忙的地方尽管说，我们一起想办法！开心每一天～'
            ]
        }
    },
    warning: {
        icon: '⚠️',
        name: '警告风格',
        templates: {
            催促: [
                '【重要提醒】\n\n关于[事项]，我方已多次发送沟通请求，但截至目前尚未收到任何回复。\n\n请注意：若在[日期]前仍未收到您的反馈，我们将视为您方放弃本次机会，届时将按照合同/协议条款执行相应处理。\n\n请务必在截止日期前予以回复。',
                '⚠️ 紧急催促通知\n\n尊敬的[称呼]：\n\n此为最后一次友好提醒。关于[事项]的确认工作已严重逾期，这可能导致：\n• 项目进度延误\n• 相关费用产生\n• 合作关系受影响\n\n请于24小时内回复，否则我方将采取必要措施。'
            ],
            拒绝: [
                '【正式通知】\n\n经评估，我方正式拒绝贵方所提方案。\n\n主要原因如下：\n1. 条款不符合我方标准\n2. 风险评估未通过\n3. 与当前战略方向不一致\n\n此决定为最终决定，不接受进一步协商。感谢您的理解。',
                '⚠️ 拒绝声明\n\n请注意：您的请求已被正式拒绝。\n\n我方已对此事进行慎重考虑，基于[具体原因]，无法接受您的提议。请勿再就此事进行进一步沟通。\n\n如有异议，请通过正式渠道提出书面申诉。'
            ],
            询问: [
                '【严肃询问】\n\n尊敬的相关方：\n\n我方需要就以下事项进行正式询问，请务必如实回答：\n\n1. [问题一]\n2. [问题二]\n3. [问题三]\n\n请于[日期]前提交书面回复。未能及时回复可能影响双方后续合作。',
                '⚠️ 正式问询函\n\n关于[事项]，我方发现若干疑点，现正式要求贵方予以解释说明。\n\n如无法提供合理解释，我方保留采取进一步法律措施的权利。\n\n请严肃对待此询问，并于规定时间内答复。'
            ],
            通知: [
                '【严重警告通知】\n\n⚠️ 请立即注意！\n\n根据[依据]，现正式通知如下：\n\n由于[原因]，[后果说明]。如不在[时限]内采取相应措施，将面临以下处罚：\n• [处罚1]\n• [处罚2]\n• [处罚3]\n\n请务必重视此通知，立即采取行动。',
                '【最后通牒】\n\n这是关于[事项]的最终警告。\n\n您必须在[日期/时间]之前完成以下操作：\n1. [要求1]\n2. [要求2]\n\n逾期未完成，后果自负。我方不再另行通知。'
            ],
            默认: [
                '⚠️ 重要通知\n\n请认真阅读以下内容：\n\n关于您提及的事项，我方有必要提醒您注意潜在风险和可能的后果。建议您：\n\n1. 仔细评估当前状况\n2. 及时采取补救措施\n3. 避免事态进一步恶化\n\n如需进一步沟通，请通过正式渠道联系。',
                '【警示函】\n\n收件人请注意：\n\n此消息旨在提醒您关注[相关事项]的严重性。忽视此警告可能导致不可挽回的后果。\n\n我们强烈建议您立即检视相关情况并采取适当行动。'
            ]
        }
    },
    tactful: {
        icon: '🎭',
        name: '委婉风格',
        templates: {
            催促: [
                '不知道您最近是否特别忙碌？关于我们之前提到的那件事，如果您这边暂时还没来得及考虑的话，其实也完全可以理解的。只是想着万一您有什么顾虑的话，我们也可以一起商量看看……',
                '打扰您了，实在不好意思。其实也没什么大事，就是想着那件事情可能对您来说也挺重要的，所以就冒昧来问一下。当然，如果时机不太合适的话，我们改天再聊也是完全没问题的～'
            ],
            拒绝: [
                '首先真的非常感谢您对我的信任！说实话，您的提议确实很有吸引力，让我考虑了很久。不过呢，综合考虑各方面因素后，我觉得可能现在的时机还不是特别成熟……或许将来条件合适的时候，我们可以再探讨这个话题？',
                '这件事我想了很久，说真的有点为难……您的好意我心领了，只是目前的情况可能不太允许我这样做。希望您能够理解我的处境。不过话说回来，您的想法本身是很好的，只是可能对我来说时机不对吧。'
            ],
            询问: [
                '不知道方不方便请教您一个问题呀？其实也不是什么大事，就是有个小小的想法想跟您探讨一下。当然如果您觉得不合适的话，就当我没说好了～',
                '冒昧地问一下，不知道您有没有兴趣聊聊[话题]呢？其实我也不确定这样问合不合适，不过想着您在这方面比较有经验，所以就斗胆来请教一下。如果打扰到您了，真的很抱歉～'
            ],
            通知: [
                '有件事情想跟您说一下，希望不会给您带来太多困扰……其实是这样的，[事项]可能需要做一些小小的调整。我知道这可能会给您带来一些不便，真的非常抱歉。我们会尽量让这个变化的影响最小化的。',
                '我想着还是提前跟您通个气比较好，虽然不太好开口……是这样，关于[事项]，情况有了一些变化。虽然这可能不是最理想的结果，但相信您也能理解，有时候事情的发展确实不完全在我们的掌控之中……'
            ],
            默认: [
                '或许我这样说不太恰当，但还是想表达一下我的看法……当然，这只是我个人的一点浅见，如果说得不对的地方，还请您多多包涵。总之呢，我的意思是……',
                '其实我也在犹豫要不要跟您说这些，毕竟可能也不是什么特别紧要的事情。不过转念一想，还是觉得应该让您知道比较好。希望我没有把事情复杂化，如果让您为难了，真的很抱歉哦。'
            ]
        }
    },
    encouraging: {
        icon: '💪',
        name: '鼓励风格',
        templates: {
            催促: [
                '嘿！我知道你最近肯定特别忙，能同时处理这么多事情真的很厉害！👏 关于之前的那件事，我相信以你的能力一定能处理得很好。期待看到你的精彩表现！我们都在支持你！💪',
                '加油！我知道你一直都很努力，这次也一定行！关于[事项]，当你准备好的时候告诉我就好。我对你很有信心，相信你会给我一个满意的答复的！🌟'
            ],
            拒绝: [
                '虽然这次我们可能没办法合作，但这完全不影响我对你的欣赏！你的想法真的很棒，我相信一定会找到更好的机会来实现的。继续加油，未来可期！下次有合适的项目，我一定第一时间想到你！✨',
                '这次的提议虽然不太适合我，但我必须说，能有这样的想法证明你真的很有创造力！不要因为这次没成就气馁，每一次尝试都是进步的阶梯。期待看到你更多优秀的想法！💫'
            ],
            询问: [
                '你好呀！你们团队做的事情真的太棒了，一直都让我特别佩服！🙌 我想着如果能有机会一起合作那该多好呀！不知道你们有没有兴趣呢？相信我们一起能创造出更amazing的东西！',
                '看了你的作品，真的被惊艳到了！能做出这样的成绩，背后一定付出了很多努力吧。我在想，如果能够有机会向你学习或者一起合作，对我来说会是莫大的荣幸！💖'
            ],
            通知: [
                '有个消息要告诉大家！虽然[事项]有一些变化，但这完全是我们进步的机会！💪 每一次调整都让我们变得更强。我相信以我们团队的能力，一定能把这次的挑战变成精彩的成绩！一起加油！🔥',
                '小伙伴们，新的挑战来啦！关于[事项]的调整，我知道可能需要大家多花些精力，但这正是展现我们实力的好时机呀！相信自己，我们一定能做到！团队的每一个人都是最棒的！⭐'
            ],
            默认: [
                '收到你的消息啦！首先想说，你真的很棒！💯 不管是什么事情，我相信你一定能处理得很好。如果需要任何帮助，随时找我！我们是一个团队，一起加油！你是最棒的！🏆',
                '谢谢你的信息！要知道，每一次沟通都是进步的机会。我特别欣赏你积极沟通的态度！👍 不管接下来是什么事情，我相信我们都能一起想出最好的解决方案。保持这种状态，继续发光发热！✨'
            ]
        }
    }
};

// ===== 工具函数 =====

/**
 * 分析输入文本的意图
 */
function analyzeIntent(text) {
    const intentKeywords = {
        催促: ['催', '回复', '跟进', '等待', '进度', '什么时候', '尽快', '急'],
        拒绝: ['拒绝', '不行', '不能', '无法', '抱歉', '对不起', '不接受', '不同意'],
        询问: ['合作', '咨询', '请问', '想问', '能否', '可以吗', '有意向', '意向'],
        通知: ['通知', '告知', '更新', '延期', '变更', '调整', '改变', '推迟']
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return intent;
            }
        }
    }
    return '默认';
}

/**
 * 获取重写后的消息
 */
function getRewrittenMessage(text, style) {
    const intent = analyzeIntent(text);
    const templates = styleConfig[style].templates[intent];
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
}

/**
 * 打字机效果
 */
async function typeWriter(element, text, speed = 20) {
    element.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    element.appendChild(cursor);

    for (let i = 0; i < text.length; i++) {
        // 在光标前插入文字
        const textNode = document.createTextNode(text[i]);
        element.insertBefore(textNode, cursor);

        // 根据字符调整延迟
        let delay = speed;
        if (text[i] === '\n') delay = speed * 3;
        else if (['，', '。', '！', '？', '：'].includes(text[i])) delay = speed * 4;

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 移除光标
    setTimeout(() => cursor.remove(), 1000);
}

/**
 * 显示Toast提示
 */
function showToast() {
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

/**
 * 更新风格徽章
 */
function updateStyleBadge(style) {
    const config = styleConfig[style];
    styleBadge.innerHTML = `
        <span class="badge-icon">${config.icon}</span>
        <span class="badge-text">${config.name}</span>
    `;
}

// ===== 事件处理 =====

// 字符计数
inputText.addEventListener('input', () => {
    const count = inputText.value.length;
    charCount.textContent = `${count} / 2000`;

    // 超过限制时变色
    if (count > 1800) {
        charCount.style.color = '#EF4444';
    } else {
        charCount.style.color = '';
    }
});

// 风格选择
styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (isProcessing) return;

        styleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStyle = btn.dataset.style;
    });
});

// 重写按钮
rewriteBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();

    if (!text) {
        inputText.focus();
        inputText.classList.add('shake');
        setTimeout(() => inputText.classList.remove('shake'), 500);
        return;
    }

    if (isProcessing) return;
    isProcessing = true;

    // 显示加载状态
    rewriteBtn.classList.add('loading');
    rewriteBtn.disabled = true;

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    // 获取重写结果
    const rewrittenText = getRewrittenMessage(text, currentStyle);

    // 更新UI
    updateStyleBadge(currentStyle);
    resultSection.classList.add('visible');

    // 隐藏加载状态
    rewriteBtn.classList.remove('loading');
    rewriteBtn.disabled = false;

    // 打字机效果显示结果
    await typeWriter(resultContent, rewrittenText);

    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    isProcessing = false;
});

// 复制按钮
copyBtn.addEventListener('click', async () => {
    const text = resultContent.textContent;

    try {
        await navigator.clipboard.writeText(text);
        showToast();
    } catch (err) {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast();
    }
});

// 重新生成按钮
regenerateBtn.addEventListener('click', () => {
    if (!isProcessing) {
        rewriteBtn.click();
    }
});

// 添加抖动动画类
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    .shake {
        animation: shake 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);

// ===== 初始化 =====
console.log('✨ 消息重写助手已加载');

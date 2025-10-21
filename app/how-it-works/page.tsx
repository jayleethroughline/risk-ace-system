export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          How ACE Works: A Simple Guide
        </h1>
        <p className="text-lg text-gray-600">
          Understanding the Agent Context Engineering (ACE) system step by step
        </p>
      </div>

      {/* Introduction */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 What is ACE?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Imagine you're teaching an AI to identify mental health crises, like teaching someone to recognize when a friend needs help.
          ACE is a system that helps AI learn from its mistakes and get better over time, kind of like how you get better at a video game
          by learning from each level you play.
        </p>
        <p className="text-gray-700 leading-relaxed">
          ACE has three main "agents" (think of them as team members) working together:
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <strong className="text-blue-600">Generator:</strong> The classifier who reads text and makes predictions
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <strong className="text-purple-600">Reflector:</strong> The critic who analyzes what went wrong
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <strong className="text-green-600">Curator:</strong> The teacher who writes new rules to prevent future mistakes
            </div>
          </div>
        </div>
      </section>

      {/* The Playbook */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 The Playbook (Our "Cheat Sheet")</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Before we start, we need a <strong>playbook</strong> – think of it as a cheat sheet with helpful tips.
          Each tip is called a <strong>heuristic</strong> (a fancy word for "rule of thumb").
        </p>
        <div className="bg-white rounded p-4 border-l-4 border-blue-500">
          <p className="font-semibold text-gray-900 mb-2">Example heuristics:</p>
          <ul className="space-y-1 text-gray-700 text-sm">
            <li>• "Mentions of specific suicide plans with identified means = CRITICAL risk"</li>
            <li>• "Active self-harm with deep cutting = HIGH risk"</li>
            <li>• "Feeling sad without harmful thoughts = LOW risk"</li>
          </ul>
        </div>
        <p className="text-gray-700 leading-relaxed mt-4">
          At the beginning, we might have just a few basic rules. But as the system learns, the playbook grows with better,
          more specific rules.
        </p>
      </section>

      {/* Epoch Introduction */}
      <section className="bg-yellow-50 rounded-lg shadow-md p-6 border-2 border-yellow-300">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🔄 What's an Epoch?</h2>
        <p className="text-gray-700 leading-relaxed">
          An <strong>epoch</strong> is one complete cycle of learning. Think of it like one practice session where you:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mt-3">
          <li>Try to classify some examples (Generator)</li>
          <li>Check your answers (Evaluation)</li>
          <li>Figure out what went wrong (Reflector)</li>
          <li>Write down new tips to remember (Curator)</li>
          <li>Start the next practice session with your new tips (Next Epoch)</li>
        </ol>
      </section>

      {/* Step 1: Generator */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">Step 1: 🤖 Generator - Making Predictions</h2>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">What does it do?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Generator reads messages and tries to figure out two things:
        </p>
        <div className="bg-blue-50 rounded p-4 mb-4">
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>Category:</strong> What type of crisis? (suicide, self-harm, eating disorder, etc.)</li>
            <li><strong>Risk Level:</strong> How urgent? (CRITICAL, HIGH, MEDIUM, or LOW)</li>
          </ol>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">How does it work?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Generator uses the <strong>evaluation dataset</strong> (a set of test examples we already know the correct answers for).
          For each message, it:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Reads the playbook to see what rules might apply</li>
          <li>Looks at which heuristics match the message</li>
          <li>Makes a prediction about the category and risk level</li>
          <li>Records which heuristics it used (this is important for tracking effectiveness!)</li>
        </ol>

        <div className="bg-gray-50 rounded p-4 border-l-4 border-blue-500">
          <p className="font-semibold text-gray-900 mb-2">Real Example:</p>
          <p className="text-sm text-gray-700 mb-3">
            <strong>Input message:</strong> "I've been cutting myself daily and I can't stop. I hate myself."
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Generator thinks:</strong> "This mentions self-harm ('cutting'), it's happening repeatedly ('daily'),
            and there's self-hatred. According to my playbook, this matches the heuristic for NSSI with active behavior."
          </p>
          <p className="text-sm font-semibold text-blue-600">
            <strong>Prediction:</strong> Category = NSSI (Non-Suicidal Self-Injury), Risk = HIGH
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Heuristics cited: ["nssi-high-r5-e2-12", "nssi-critical-baseline-3"]
          </p>
        </div>

        <div className="mt-4 bg-yellow-50 rounded p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> The Generator processes the entire evaluation dataset (typically 65 samples in our system).
            This takes a few minutes because the AI needs to think carefully about each message.
          </p>
        </div>
      </section>

      {/* Step 2: Evaluation */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-orange-600 mb-4">Step 2: 📊 Evaluation - Checking Answers</h2>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">What does it do?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          After the Generator makes all its predictions, we need to grade them! We compare the predictions to the correct answers
          (which we already knew) to see how well it did.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">How are scores calculated?</h3>
        <div className="space-y-4">
          <div className="bg-green-50 rounded p-4">
            <p className="font-semibold text-gray-900 mb-2">1. Accuracy (The Simple Score)</p>
            <p className="text-gray-700 text-sm mb-2">
              Percentage of predictions where BOTH category AND risk level were exactly right.
            </p>
            <p className="text-sm text-gray-600">
              Formula: (Correct Predictions) ÷ (Total Predictions) × 100%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Example: If we got 17 out of 65 completely correct = 26.15% accuracy
            </p>
          </div>

          <div className="bg-blue-50 rounded p-4">
            <p className="font-semibold text-gray-900 mb-2">2. F1 Score (The Smart Score)</p>
            <p className="text-gray-700 text-sm mb-2">
              This is more sophisticated – it balances two things:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <strong>Precision:</strong> When we say "this is HIGH risk," how often are we right?
                (Avoiding false alarms)
              </li>
              <li>
                <strong>Recall:</strong> When something IS high risk, how often do we catch it?
                (Not missing real emergencies)
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              F1 = 2 × (Precision × Recall) ÷ (Precision + Recall)
            </p>
          </div>

          <div className="bg-purple-50 rounded p-4">
            <p className="font-semibold text-gray-900 mb-2">3. We Calculate THREE F1 Scores:</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <strong>Category F1:</strong> How good are we at identifying the TYPE of crisis?
                (suicide vs. self-harm vs. eating disorder, etc.)
              </li>
              <li>
                <strong>Risk F1:</strong> How good are we at identifying the URGENCY level?
                (CRITICAL vs. HIGH vs. MEDIUM vs. LOW)
              </li>
              <li>
                <strong>Overall F1:</strong> Average of the two above = our main performance metric
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-gray-50 rounded p-4 border-l-4 border-orange-500">
          <p className="font-semibold text-gray-900 mb-2">Example Results:</p>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Overall F1: 51.63%</li>
            <li>• Category F1: 55.21%</li>
            <li>• Risk F1: 48.05%</li>
            <li>• Accuracy: 26.15%</li>
            <li>• Errors Found: 48 out of 65 samples</li>
          </ul>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Heuristic Effectiveness Tracking</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Remember how the Generator records which heuristics it uses? Now we can see which rules are actually helpful!
        </p>
        <div className="bg-indigo-50 rounded p-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong className="text-green-600">Helpful Count:</strong> Times this heuristic was cited and led to a CORRECT prediction
            </li>
            <li>
              <strong className="text-red-600">Harmful Count:</strong> Times this heuristic was cited and led to an INCORRECT prediction
            </li>
          </ul>
          <p className="text-xs text-gray-600 mt-3">
            This helps us identify which rules work well and which might be misleading!
          </p>
        </div>
      </section>

      {/* Step 3: Reflector */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">Step 3: 🔍 Reflector - Learning from Mistakes</h2>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">What does it do?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Reflector is like a detective that investigates each mistake. For EVERY error the Generator made,
          it asks: "WHY did we get this wrong?"
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">How does it work?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Reflector takes each error and analyzes:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Error Type:</strong> What kind of mistake was this?</li>
          <li><strong>Correct Approach:</strong> What SHOULD we have done?</li>
          <li><strong>Key Insight:</strong> What's the lesson here?</li>
          <li><strong>Affected Section:</strong> Which category does this relate to?</li>
          <li><strong>Tag:</strong> A label to categorize this type of mistake</li>
        </ol>

        <div className="bg-gray-50 rounded p-4 border-l-4 border-purple-500">
          <p className="font-semibold text-gray-900 mb-2">Real Example:</p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Input:</strong> "I keep thinking about not wanting to wake up anymore."
          </p>
          <p className="text-sm mb-2">
            <span className="text-red-600 font-semibold">❌ Generator predicted:</span> Category = suicide, Risk = CRITICAL
          </p>
          <p className="text-sm mb-3">
            <span className="text-green-600 font-semibold">✓ Correct answer:</span> Category = suicide, Risk = MEDIUM
          </p>

          <div className="mt-3 p-3 bg-purple-50 rounded">
            <p className="text-sm font-semibold text-gray-900 mb-2">Reflector's Analysis:</p>
            <ul className="space-y-1 text-xs text-gray-700">
              <li><strong>Error Type:</strong> risk_overestimation</li>
              <li><strong>Correct Approach:</strong> Passive ideation without plan or means should be MEDIUM, not CRITICAL</li>
              <li><strong>Key Insight:</strong> Distinguish between active planning and passive thoughts about death</li>
              <li><strong>Affected Section:</strong> suicide</li>
              <li><strong>Tag:</strong> passive_vs_active_ideation</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 rounded p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-700">
            <strong>Time taken:</strong> The Reflector needs to carefully analyze each error. With 48 errors,
            this takes about 4-5 minutes (roughly 5-6 seconds per error for the AI to think deeply).
          </p>
        </div>
      </section>

      {/* Step 4: Curator */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Step 4: 📝 Curator - Creating New Rules</h2>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">What does it do?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Curator reads all the Reflector's insights and writes NEW heuristics (rules) to add to the playbook.
          Think of it as updating your cheat sheet with better tips!
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">How does it work?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          For each reflection, the Curator:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Reads the error analysis and insight</li>
          <li>Generates 1-2 specific, actionable rules</li>
          <li>Assigns the rule to the correct category and risk level</li>
          <li>Adds it to the playbook with a unique ID</li>
        </ol>

        <div className="bg-gray-50 rounded p-4 border-l-4 border-green-500">
          <p className="font-semibold text-gray-900 mb-2">Example - From Reflection to Heuristic:</p>

          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1">Reflector found:</p>
            <p className="text-sm text-gray-700 italic">
              "We keep overestimating risk when someone expresses passive thoughts without specific plans"
            </p>
          </div>

          <div className="p-3 bg-green-50 rounded">
            <p className="text-sm text-gray-600 mb-1">Curator creates:</p>
            <p className="text-sm font-semibold text-gray-900">
              [suicide] Passive suicidal ideation (e.g., wishing not to wake up, not wanting to exist)
              without specific plan or means = MEDIUM risk
            </p>
            <p className="text-xs text-gray-500 mt-2">
              ID: suicide-medium-r7-e1-23 (Run 7, Epoch 1, Heuristic #23)
            </p>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Adding to the Playbook</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Each new heuristic is immediately added to the playbook database. This means:
        </p>
        <ul className="space-y-2 text-gray-700 mb-4">
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>The playbook grows from 49 heuristics → 54 heuristics → 60 heuristics, etc.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>We can track which run and epoch added each rule</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>We monitor effectiveness (helpful vs. harmful counts)</span>
          </li>
        </ul>

        <div className="mt-4 bg-yellow-50 rounded p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-700">
            <strong>Time taken:</strong> The Curator processes all 48 reflections and typically generates
            1-2 heuristics per reflection, adding about 50-60 new rules to the playbook.
            This takes about 4-5 minutes total.
          </p>
        </div>
      </section>

      {/* Step 5: Next Epoch */}
      <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">Step 5: 🔄 Next Epoch - Using the Improved Playbook</h2>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">What happens next?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Now comes the exciting part: we start Epoch 2! But this time, the Generator has a BETTER playbook to work with.
        </p>

        <div className="bg-white rounded p-4 mb-4 border-2 border-indigo-300">
          <p className="font-semibold text-gray-900 mb-3">Key Point: YES, we use the NEW playbook!</p>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">Epoch 1:</span>
              <span>Generator uses playbook with 49 heuristics → Makes mistakes → Curator adds 54 new rules</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">Epoch 2:</span>
              <span>Generator uses playbook with 103 heuristics (49 + 54) → Makes different/fewer mistakes → Curator adds more rules</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold">Epoch 3:</span>
              <span>Generator uses even larger playbook → Performance improves → Cycle continues</span>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">How is Epoch 2 evaluation done?</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The evaluation process is EXACTLY the same:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <strong>Generator</strong> classifies the SAME evaluation dataset (those 65 test samples)
            <ul className="list-disc list-inside ml-6 mt-2 text-sm">
              <li>But now it has MORE and BETTER heuristics to reference</li>
              <li>It cites which heuristics it uses (including the new ones)</li>
            </ul>
          </li>
          <li>
            <strong>Evaluation</strong> compares predictions to correct answers
            <ul className="list-disc list-inside ml-6 mt-2 text-sm">
              <li>Calculate Accuracy, F1 scores</li>
              <li>Update helpful/harmful counts for ALL heuristics (old and new)</li>
            </ul>
          </li>
          <li>
            <strong>Reflector</strong> analyzes any remaining errors
            <ul className="list-disc list-inside ml-6 mt-2 text-sm">
              <li>Hopefully fewer errors this time!</li>
              <li>May discover NEW types of mistakes</li>
            </ul>
          </li>
          <li>
            <strong>Curator</strong> adds MORE heuristics based on new insights
            <ul className="list-disc list-inside ml-6 mt-2 text-sm">
              <li>Playbook continues to grow and improve</li>
            </ul>
          </li>
        </ol>

        <div className="mt-4 bg-indigo-100 rounded p-4 border-l-4 border-indigo-600">
          <p className="font-semibold text-gray-900 mb-2">Expected Improvement:</p>
          <div className="text-sm space-y-1 text-gray-700">
            <div className="flex justify-between">
              <span>Epoch 1:</span>
              <span className="font-semibold">F1 = 51.63%, Accuracy = 26.15%</span>
            </div>
            <div className="flex justify-between">
              <span>Epoch 2:</span>
              <span className="font-semibold text-green-600">F1 = 58.42%, Accuracy = 35.38% ⬆️</span>
            </div>
            <div className="flex justify-between">
              <span>Epoch 3:</span>
              <span className="font-semibold text-green-600">F1 = 63.15%, Accuracy = 43.08% ⬆️</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Performance typically improves each epoch as the playbook becomes more comprehensive!
          </p>
        </div>
      </section>

      {/* The Cycle Continues */}
      <section className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">♾️ The Iterative Learning Cycle</h2>
        <p className="leading-relaxed mb-4">
          The beauty of ACE is that this cycle CONTINUES. Each epoch:
        </p>
        <ul className="space-y-2 mb-4">
          <li className="flex items-start gap-2">
            <span>📈</span>
            <span>The playbook gets bigger and smarter</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🎯</span>
            <span>Predictions become more accurate</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🧠</span>
            <span>The system learns to handle edge cases</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✨</span>
            <span>Performance improves without needing more training data</span>
          </li>
        </ul>

        <div className="bg-white/10 backdrop-blur rounded p-4 mt-4">
          <p className="font-semibold mb-2">When does it stop?</p>
          <p className="text-sm">
            Training continues until we reach the maximum number of epochs (e.g., 10) OR until performance
            stops improving (plateaus). We set a "patience" parameter – if the F1 score doesn't improve
            for 3 epochs in a row, we stop early because the system has learned as much as it can from
            this evaluation dataset.
          </p>
        </div>
      </section>

      {/* Summary */}
      <section className="bg-gray-900 text-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">🎓 Summary: The Complete Picture</h2>
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded p-4">
            <p className="font-semibold mb-2">1️⃣ Setup Phase</p>
            <p className="text-sm">Start with a basic playbook and prepare training/evaluation datasets</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded p-4">
            <p className="font-semibold mb-2">2️⃣ Each Epoch Cycle (10-15 minutes)</p>
            <ul className="text-sm space-y-1 mt-2">
              <li>→ Generator: Classify 65 samples using current playbook (~7 min)</li>
              <li>→ Evaluation: Calculate F1 scores and track heuristic effectiveness (~instant)</li>
              <li>→ Reflector: Analyze all errors (~5 min)</li>
              <li>→ Curator: Generate new heuristics and add to playbook (~4 min)</li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur rounded p-4">
            <p className="font-semibold mb-2">3️⃣ Next Epoch</p>
            <p className="text-sm">Repeat with the IMPROVED playbook containing all the new heuristics</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded p-4">
            <p className="font-semibold mb-2">4️⃣ Result</p>
            <p className="text-sm">
              After several epochs, you have a highly optimized playbook with 200+ specific,
              battle-tested heuristics that can accurately classify mental health crises!
            </p>
          </div>
        </div>
      </section>

      {/* Final Note */}
      <section className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border-2 border-green-300">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 Why This Works</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Traditional machine learning requires LOTS of training data and still acts like a "black box" –
          you don't know WHY it made a decision.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          ACE is different because:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Explainable:</strong> Every prediction cites which rules it used
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Self-improving:</strong> Automatically learns from mistakes without human intervention
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Efficient:</strong> Works with small datasets (just 65 evaluation samples)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Trackable:</strong> We can see which rules work (helpful) and which don't (harmful)
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

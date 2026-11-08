/* Power-Up Math: shop checkout puzzles. Paying for something is a little math puzzle that matches the
   kid's current math world:
   - count, add10:   tap bags of 5 crystals ("Tap 4 bags")
   - add20:          make the price with tens and ones
   - add100:         how many are left after paying (or tens and ones once the wallet is over 100)
   - times:          N bags of 5 (or 10): how many crystals is that?
   - divide:         the price in bags of 5 (or 10): how many bags?
   - mix:            how many are left after paying
   Prices are multiples of 5. A puzzle is {mode:'bags'|'tens'|'choice', prompt, ...}. */
(function () {
'use strict';
const SH = PUM.SHOP = {};
const rnd = n => Math.floor(Math.random() * n);

/* four different whole-number options around the answer */
function options(ans, steps) {
  const out = [ans];
  for (const d of steps) { for (const v of [ans + d, ans - d]) if (v > 0 && !out.includes(v) && out.length < 4) out.push(v); }
  let k = 1; while (out.length < 4) { const v = ans + k++; if (!out.includes(v)) out.push(v); }
  return PUM.util.shuffle(out);
}

/* p: player, price: crystals, wallet: crystals the kid has, unit: 'crystals' */
SH.puzzle = function (p, price, wallet, unit = 'crystals') {
  const w = p.world, tier = (p.levels[w] || {tier:0}).tier;
  if (w === 'count' || w === 'add10') {
    const n = price / 5;
    return {mode:'bags', bag:5, target:n, ghost:w === 'count' && tier <= 1,
      prompt:`That's ${n} bag${n > 1 ? 's' : ''} of ${unit}. Tap ${n} bag${n > 1 ? 's' : ''} to pay!`, say:`Tap ${n} bags to pay!`,
      explain:`It needed ${n} bag${n > 1 ? 's' : ''}. Let's count: ${Array.from({length:n}, (_, i) => i + 1).join(', ')}!`};
  }
  if (w === 'add20' || (w === 'add100' && wallet > 100)) {
    const t = Math.floor(price / 10), o = price % 10;
    return {mode:'tens', target:price, prompt:`It costs ${price}. Make ${price} with tens and ones!`, say:`Make ${price} with tens and ones!`,
      explain:`${price} is ${t} ten${t === 1 ? '' : 's'}${o ? ` and ${o} one${o === 1 ? '' : 's'}` : ''}.`};
  }
  if (w === 'times' || w === 'divide') {
    const bag = price % 10 === 0 && price > 10 && Math.random() < .5 ? 10 : 5, n = price / bag;
    if (w === 'times') return {mode:'choice', ans:price, options:options(price, [bag, 5, 10, 1]),
      prompt:`Tanu wants ${n} bag${n > 1 ? 's' : ''} of ${bag} ${unit}. How many ${unit} is that?`, say:`${n} bag${n > 1 ? 's' : ''} of ${bag}. How many is that?`, explain:`${n} × ${bag} = ${price}`};
    return {mode:'choice', ans:n, options:options(n, [1, 2, 3]),
      prompt:`It costs ${price}. Each bag holds ${bag} ${unit}. How many bags do you pay?`, say:`${price} in bags of ${bag}. How many bags?`, explain:`${price} ÷ ${bag} = ${n}`};
  }
  /* add100 (wallet up to 100) and mix: change after paying */
  const left = wallet - price;
  return {mode:'choice', ans:left, options:options(left, [10, 1, 5, 20]),
    prompt:`You have ${wallet} ${unit}. It costs ${price}. How many will you have left?`, say:`You have ${wallet}. It costs ${price}. How many left?`, explain:`${wallet} − ${price} = ${left}`};
};

/* is this payment right? paid: array of piece values for the tap modes, or the picked option */
SH.check = function (pz, paid) {
  if (pz.mode === 'choice') return Number(paid) === pz.ans;
  if (pz.mode === 'bags') return paid.length === pz.target;
  return paid.reduce((s, v) => s + v, 0) === pz.target;
};
})();

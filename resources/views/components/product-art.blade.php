@props(['type' => 'package'])
<span class="product-art art-{{ $type }}" aria-hidden="true">
@switch($type)
@case('headphones')
<svg viewBox="0 0 80 80"><path d="M19 45V34a21 21 0 0 1 42 0v11" fill="none" stroke="#443d4d" stroke-width="7"/><path d="M22 41v16m36-16v16" stroke="#27222e" stroke-width="14" stroke-linecap="round"/><path d="M25 20a22 22 0 0 1 31 2" fill="none" stroke="#a19aab" stroke-width="3"/></svg>@break
@case('lamp')
<svg viewBox="0 0 80 80"><ellipse cx="40" cy="65" rx="19" ry="4" fill="#c9bdab"/><path d="M40 37v26" stroke="#a59a87" stroke-width="4"/><path d="M25 18h30l10 26H15l10-26Z" fill="#dfcfb3"/><path d="M25 18h15v26H15l10-26Z" fill="#eeddc4"/><ellipse cx="40" cy="44" rx="25" ry="3" fill="#bcaa8a"/></svg>@break
@case('bag')
<svg viewBox="0 0 80 80"><path d="M28 27v-5a12 12 0 0 1 24 0v5" fill="none" stroke="#9d7f5d" stroke-width="4"/><path d="M19 26h42l5 40H14l5-40Z" fill="#c3a480"/><path d="M29 26v15m22-15v15" stroke="#927354" stroke-width="3"/><path d="M20 28h7v35h-11l4-35Z" fill="#d6bfa1"/></svg>@break
@case('keyboard')
<svg viewBox="0 0 80 80"><rect x="7" y="26" width="66" height="31" rx="5" fill="#c6c4d5"/><rect x="7" y="23" width="66" height="30" rx="5" fill="#ebe9f2"/><path d="M14 30h6m5 0h6m5 0h6m5 0h6m5 0h7M14 37h6m5 0h6m5 0h6m5 0h6m5 0h7M14 44h8m5 0h26m5 0h7" stroke="#a8a2bc" stroke-width="4" stroke-linecap="round"/></svg>@break
@case('bottle')
<svg viewBox="0 0 80 80"><rect x="32" y="10" width="16" height="9" rx="2" fill="#515c53"/><path d="M30 19h20l5 10v34a5 5 0 0 1-5 5H30a5 5 0 0 1-5-5V29l5-10Z" fill="#99ad9a"/><path d="M32 27v33" stroke="#bbccba" stroke-width="4" stroke-linecap="round"/></svg>@break
@case('mug')
<svg viewBox="0 0 80 80"><path d="M54 27h6a12 12 0 0 1 0 24h-7" fill="none" stroke="#bd9c81" stroke-width="6"/><path d="M17 24h39v29a12 12 0 0 1-12 12H29a12 12 0 0 1-12-12V24Z" fill="#d8bca3"/><ellipse cx="36.5" cy="24" rx="19.5" ry="4" fill="#b89678"/><path d="M23 31v21" stroke="#e9d3bd" stroke-width="4" stroke-linecap="round"/></svg>@break
@case('speaker')
<svg viewBox="0 0 80 80"><rect x="21" y="11" width="38" height="58" rx="8" fill="#38383d"/><circle cx="40" cy="47" r="13" fill="#1e1e25"/><circle cx="40" cy="47" r="8" fill="#55535e"/><circle cx="40" cy="23" r="5" fill="#77717f"/></svg>@break
@case('watch')
<svg viewBox="0 0 80 80"><rect x="30" y="3" width="20" height="74" rx="6" fill="#b8b7c2"/><rect x="21" y="20" width="38" height="40" rx="11" fill="#dddbe5"/><rect x="25" y="24" width="30" height="32" rx="8" fill="#303039"/><path d="M40 29v12l8 5" stroke="#b7a2f6" stroke-width="3" fill="none" stroke-linecap="round"/></svg>@break
@default
<svg viewBox="0 0 80 80"><path d="m13 26 27-13 27 13v30L40 70 13 56V26Z" fill="#c6b2e7"/><path d="m13 26 27 14 27-14M40 40v30" stroke="#9375bf" stroke-width="2"/><path d="m26 19 28 14v12l-10 5V38L16 25" fill="#e8d9ff"/></svg>
@endswitch
</span>

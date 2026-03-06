$p = C:\Users\justi\Documents\git\Portfolio-2026\Portfolio-2026\styles.css
$c = Get-Content -Raw -LiteralPath $p

# Replace the letter-by-letter reveal styles with a continuous masked overlay.
$c = $c -replace (?s)\.name-letter\s*\{.*?\}\s*\n\s*\.name-letter\.is-on\s*\{.*?\}\s*\n, "

# Ensure center-name has the right base styling and reveal var.
$c = $c -replace (?s)\.center-name\s*\{\s*display: grid;.*?user-select: none;\s*\}, .center-name {`r`n  display: grid;`r`n  place-items: center;`r`n  text-transform: uppercase;`r`n  letter-spacing: 0.06em;`r`n  font-weight: 600;`r`n  font-size: clamp(3.25rem, 7.2vw, 6.25rem);`r`n  line-height: 0.95;`r`n  padding-block: 2.5rem;`r`n  user-select: none;`r`n  white-space: nowrap;`r`n  position: relative;`r`n  --reveal: 0%;`r`n  color: rgba(245, 245, 245, 0.22);`r`n}

# Insert the masked overlay after the first .center-name block.
if ($c -notmatch \.center-name::before) {
 $c = $c -replace \.center-name \{[\s\S]*?\}\r?\n, $0`r`n.center-name::before {`r`n  content: attr(data-name);`r`n  position: absolute;`r`n  inset: 0;`r`n  display: grid;`r`n  place-items: center;`r`n  color: rgba(245, 245, 245, 1);`r`n  pointer-events: none;`r`n  -webkit-mask-image: linear-gradient(90deg, #000 0, #000 var(--reveal), transparent var(--reveal));`r`n  mask-image: linear-gradient(90deg, #000 0, #000 var(--reveal), transparent var(--reveal));`r`n}`r`n
}

# Keep the existing zoom transition block, but make sure it still exists.
if ($c -notmatch \.center-name\.is-zoomed) {
 throw Expected zoom styles missing
}

Set-Content -LiteralPath $p -Value $c -Encoding utf8 -NoNewline
$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    # Error happens at 924.
    # The structure in previous Read output:
    # 922: </label>
    # 923: </div> (Closing "Ambiente de Produção")
    # 924: </div> (Closing "Configuração RPS" wrapper)
    # 925: )}
    
    # But wait, looking at lines 911-925 in the previous output:
    # 911: <div style={{ marginTop: '1rem'... (Wrapper)
    # 912: <h4...
    # 913:
    # 914: <h5... (Produção Title)
    # 915: <div... (Produção Fields)
    # ...
    # 918: </div> (Closing Produção Fields)
    # 919: <label... (Produção Checkbox)
    # ...
    # 922: </label> (Closing Produção Checkbox)
    # 923: </div> (Wait, this closes... what? It seems to close the Wrapper? But where did the inner block close?)
    
    # Ah, in the original code, there was a wrapper <div> around the Homologacao block and another around the Producao block.
    # But my removal script might have removed the opening <div> of the Producao block if it was on the same line or if I messed up the logic.
    
    # Let's check line 914 again.
    # 914: <h5...
    # It seems I removed the <div> that was supposed to wrap the Producao block?
    # In the original (before removal), it was:
    # <div> (Homologacao) ... </div>
    # <div> (Producao) ... </div>
    
    # Now it looks like:
    # <Wrapper>
    #   <h4>
    #   <h5> (Producao)
    #   <div> (Fields) ... </div>
    #   <label> ... </label>
    # </div> (Closing Wrapper)
    # </div> (Extra closing div?)
    
    # Line 923 is </div>. Line 924 is </div>.
    # If we have:
    # Wrapper (Open)
    #   H4
    #   H5
    #   Div (Fields Open)
    #   Div (Fields Close)
    #   Label (Open)
    #   Label (Close)
    # Div (Wrapper Close?)
    # Div (Extra?)
    
    # If line 924 is </div> and it errors, maybe it's unmatched?
    # Or maybe the previous script `remove_homologacao.ps1` kept the closing div of the homologacao block but removed the opening?
    # No, it skipped lines.
    
    # Let's simply remove line 924 if it's an extra </div>.
    # Or better, let's look at the indentation.
    # 923 is aligned with 911 (Wrapper)? No, 911 is indented far left.
    # 923 seems to be closing the Wrapper.
    # 924 is extra.
    
    # Actually, looking at the code:
    # 911: <div style... (Wrapper)
    # ... content ...
    # 923: </div> (Matches 911)
    # 924: </div> (Matches... nothing?)
    
    # Wait, line 924 in the previous `Read` output shows `</div>`.
    # And line 925 shows `)}`.
    # If 924 is an extra div, it would cause a syntax error (JSX fragment needs one parent, but this is inside `{ ... && ( ... )}` so it expects one root element).
    # The root element is the div at 911.
    # So 923 closes 911.
    # 924 is garbage.
    
    if ($i -eq 924 -and $line.Trim() -eq "</div>") { # 0-indexed vs 1-indexed? Read output uses 1-based line numbers usually?
        # Read output says 924 -> </div>
        # My loop is 0-indexed. So index 923 (if starting from 0) or 924 (if starting from 1).
        # PowerShell Get-Content returns array 0-indexed.
        # So I need to check around that index.
        # Let's rely on content context.
    }
}

# Simpler approach:
# The `Read` output shows line numbers.
# 923: </div>
# 924: </div>
# 925: )}
# We want to remove one of these </div>s.
# The indentation of 923 looks like it matches 915? No.
# Let's look at 915: <div style={{ display: 'grid'...
# That closes at 918.
# 919 is <label>. Closes at 922.
# So at 923, we are back to the level of 914 (h5) and 912 (h4).
# So 923 closes 911 (Wrapper).
# So 924 is definitely extra.

# I will verify this by matching the line content exactly.
$content = $lines -join "`n"
# Find the sequence:
# </label>
# </div>
# </div>
# )}

# And replace it with:
# </label>
# </div>
# )}

if ($content -match "</label>\s*</div>\s*</div>\s*\)\}") {
    Write-Host "Found double closing div."
    $content = $content -replace "(</label>\s*</div>)\s*</div>(\s*\)\})", '$1$2'
} else {
    Write-Host "Pattern not found strictly. Trying line-by-line removal of line 924."
    # Fallback: Remove the specific line 924 if it is just </div>
    # Note: line numbers in `Read` output might slightly differ from array index if file changed, but I haven't changed it since last Read.
    # Last Read: 924 | </div>
    
    # Let's assume the array index corresponds roughly.
    # But safer to use the pattern context.
    # The pattern in the file:
    # line 922:                                             </label>
    # line 923:                                         </div>
    # line 924:                                     </div>
    # line 925:                                 )}
    
    # We want to remove line 924.
    
    # Let's iterate and build new list.
}

$newLines = New-Object System.Collections.Generic.List[string]
$skipNextDiv = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Check if we are at the problematic spot
    # Look for </label> then </div> then </div>
    if ($i -gt 2 -and $lines[$i-2].Trim() -eq "</label>" -and $lines[$i-1].Trim() -eq "</div>" -and $line.Trim() -eq "</div>") {
        # Check if the next line is )}
        if ($i + 1 -lt $lines.Count -and $lines[$i+1].Trim() -eq ")}") {
            Write-Host "Removing extra div at line $($i+1)" # 1-based for log
            continue
        }
    }
    
    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Fixed extra div."

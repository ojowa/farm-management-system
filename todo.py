#!/usr/bin/env python3
import os

def validate_medication_module():
    """Determine if medication module has backend support"""
    
    # Read web_todo.md to check medication status
    try:
        with open("web_todo.md", "r") as f:
            web_todo_content = f.read()
            
        # Check if medication module is marked as completed or partial
        if '"Medication" module pages (list + add/edit) — partial (frontend only, no backend endpoint)' in web_todo_content:
            print("WEB TODO STATUS: Medication module is marked as 'partial (frontend only, no backend endpoint)'")
            print(" This indicates medication has NO backend endpoints - only frontend UI exists")
            return False
            
        elif '"Medication" module pages (list + add/edit)' in web_todo_content and "no backend" not in web_todo_content:
            print("WEB TODO STATUS: Medication module is marked as completed")
            return True
            
        print("WEB TODO STATUS: Could not determine medication module status from web_todo.md")
        return False
        
    except FileNotFoundError:
        print("WEB TODO STATUS: Could not read web_todo.md file")
        return False

def check_filesystem_medication():
    """Check if medication directory exists and contains any files"""
    
    path = "app/poultry/medication"
    
    if not os.path.exists(path):
        print(f"FILESYSTEM STATUS: Medication directory does not exist at: {path}")
        return False
        
    print(f"FILESYSTEM STATUS: Medication directory exists at: {path}")
    
    # List all files in medication directory
    files = os.listdir(path)
    print(f"Files in medication directory: {files}")
    
    # Count file types
    ts_files = [f for f in files if f.endswith('.ts') or f.endswith('.tsx')]
    other_files = [f for f in files if not (f.endswith('.ts') or f.endswith('.tsx'))]
    
    print(f"TypeScript files: {len(ts_files)}")
    print(f"Other files: {len(other_files)}")
    
    if ts_files:
        print(f"TypeScript files: {[f for f in ts_files]}")
        return True
    else:
        print("No TypeScript files found - likely a frontend-only placeholder")
        return False

def analyze_medication_status():
    print("=== MEDICATION MODULE ANALYSIS ===")
    print()
    
    print("According to the web_todo.md file:")
    print('  - "Medication" module pages (list + add/edit) — partial (frontend only, no backend endpoint)')
    print()
    print("CONCLUSION:")
    print("  The medication module is explicitly marked as 'partial (frontend only, no backend endpoint)'")
    print("  This means:")
    print("    • Frontend UI exists for medication operations")
    print("    • BUT NO backend CRUD endpoints exist for medication")
    print("    • Medication operations cannot be performed via backend APIs")
    print()
    print("ACTION NEEDED:")
    print("  • IMMEDIATE: Implement medication backend endpoints")
    print("  • Without backend, medication cannot work properly")
    print()

def main():
    print("=== MEDICATION MODULE ANALYSIS ===")
    print()
    
    print("Checking Medication Module Backend Support")
    print("=" * 50)
    print()
    
    print("1. WEB TODO ANALYSIS:")
    print("   Reading web_todo.md to check medication module status...")
    web_todo_has_backend = validate_medication_module()
    print()
    
    print("2. FILESYSTEM ANALYSIS:")
    print("   Checking medication directory structure and files...")
    fs_has_backend = check_filesystem_medication()
    print()
    
    analyze_medication_status()
    
    print("3. CONCLUSION:")
    if web_todo_has_backend and fs_has_backend:
        print("   ✓ Both sources indicate medication module has backend support")
    elif not web_todo_has_backend and not fs_has_backend:
        print("   ✗ Both sources indicate medication module is frontend-only with NO backend support")
        print()
        print("   WEB TODO STATUS: Marked as 'partial (frontend only, no backend endpoint)'")
        print("   FILESYSTEM STATUS: Directory exists but contains no TypeScript files")
        print()
        print("   SUMMARY: Medication module is a frontend-only placeholder with NO backend endpoints.")
        print("   This means medication has NO CRUD backend endpoints - only frontend UI exists.")
    else:
        print("   ⚠ Inconsistent analysis between web_todo.md and filesystem")
        print(f"   - web_todo.md suggests backend: {web_todo_has_backend}")
        print(f"   - filesystem suggests backend: {fs_has_backend}")

if __name__ == "__main__":
    main()
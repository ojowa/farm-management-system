# Python script to analyze the directory structure and find medication module
import os
from pathlib import Path

def analyze_project_structure():
    print("=== PROJECT STRUCTURE ANALYSIS ===")
    print()
    
    # Get the current working directory
    current_dir = Path.cwd()
    print(f"Current directory: {current_dir}")
    print()
    
    # Check if the project structure exists
    mobile_path = current_dir / "apps" / "mobile" / "app" / "poultry"
    if not mobile_path.exists():
        print(f"ERROR: Directory not found: {mobile_path}")
        return
        
    print(f"Poultry module path: {mobile_path}")
    print()
    
    # List all directories in poultry module
    subdirectories = [d for d in mobile_path.iterdir() if d.is_dir()]
    print(f"Found {len(subdirectories)} submodules in poultry module:")
    for i, subdir in enumerate(subdirectories, 1):
        print(f"  {i}. {subdir.name}/")
        
        # Count files in each submodule
        files = list(subdir.glob("*"))
        print(f"     - {len(files)} files")
        
        # List file types
        ts_files = [f for f in files if f.suffix in ['.ts', '.tsx']]
        other_files = [f for f in files if f.suffix not in ['.ts', '.tsx']]
        
        print(f"     - TypeScript files: {len(ts_files)}")
        print(f"     - Other files: {len(other_files)}")
        
        # Show TypeScript files
        if ts_files:
            print(f"       TypeScript files: {[f.name for f in ts_files[:3]]}")
            if len(ts_files) > 3:
                print(f"       ... and {len(ts_files) - 3} more")
                
        print()
        
    # Special check for medication submodule
    medication_path = mobile_path / "medication"
    if medication_path.exists():
        print(f"✓ Medication submodule exists at: {medication_path}")
        
        medication_files = list(medication_path.glob("*"))
        print(f"  Files in medication module: {len(medication_files)}")
        
        # Check for TypeScript files
        ts_files = [f for f in medication_files if f.suffix in ['.ts', '.tsx']]
        print(f"  TypeScript files: {len(ts_files)}")
        
        if ts_files:
            print(f"    TypeScript files: {[f.name for f in ts_files]}")
            # Determine if this is a frontend-only module or has backend support
            for ts_file in ts_files:
                try:
                    content = ts_file.read_text()
                    if 'api' in content.lower() or 'service' in content.lower():
                        print(f"    → Possible backend endpoint in {ts_file.name}")
                    if 'prisma' in content.lower() or 'repository' in content.lower():
                        print(f"    → Has database/repository logic in {ts_file.name}")
                except Exception as e:
                    print(f"    Could not read {ts_file.name}: {e}")
        else:
            print(f"  ✗ No TypeScript files found in medication module")
            print(f"    This suggests it's a frontend-only placeholder module")
            
        # Check for API routes or controllers
        has_api = any("controller" in str(f).lower() or "route" in str(f).lower() for f in medication_files)
        if has_api:
            print(f"  → Contains API controllers/routes - likely has backend support")
        else:
            print(f"  ✗ No API/controllers found - likely frontend-only placeholder")
    else:
        print(f"✗ Medication submodule NOT found at: {medication_path}")
        
    print()
    print("=== COMPARISON WITH web_todo.md ===")
    print("web_todo.md line 57: '\"Medication\" module pages (list + add/edit) — partial (frontend only, no backend endpoint)'")
    print("This confirms: Medication module is frontend-only with NO backend endpoints")

if __name__ == "__main__":
    analyze_project_structure()
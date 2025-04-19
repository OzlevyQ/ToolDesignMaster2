
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileInfo } from "@/types";
import { UploadIcon, FileIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface FileUploadProps {
  onSelect: (fileInfo: FileInfo) => void;
}

export function FileUpload({ onSelect }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/files');
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }
        const uploadedFiles = await response.json();
        setFiles(Array.isArray(uploadedFiles) ? uploadedFiles : []);
      } catch (error) {
        console.error('Error fetching files:', error);
        toast({
          title: "שגיאה בטעינת קבצים",
          description: error instanceof Error ? error.message : "לא ניתן לטעון את רשימת הקבצים",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [toast]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: "קובץ לא נתמך",
        description: "יש להעלות רק קבצי Excel (.xlsx או .xls)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('שגיאה בהעלאת הקובץ');
      }

      const result = await response.json();
      
      if (result && result.file) {
        setFiles((prev) => [result.file, ...prev]);
        onSelect(result.file);
        
        toast({
          title: "הקובץ הועלה בהצלחה",
          description: `הקובץ "${selectedFile.name}" הועלה בהצלחה`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "שגיאה בהעלאת הקובץ",
        description: error instanceof Error ? error.message : "לא ניתן להעלות את הקובץ",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">קבצי Excel</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".xlsx,.xls"
          />
          <Button 
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            type="button"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <UploadIcon className="mr-2 h-4 w-4" />
                העלאת קובץ
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            אין קבצים זמינים. העלה קובץ Excel כדי להתחיל.
          </div>
        ) : (
          files.map((file) => (
            <Card 
              key={file.filename} 
              className="p-3 cursor-pointer hover:bg-accent flex items-center justify-between"
              onClick={() => onSelect(file)}
            >
              <div className="flex items-center">
                <FileIcon className="h-5 w-5 mr-2 text-blue-500" />
                <div>
                  <div className="font-medium line-clamp-1">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{file.size} bytes</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                בחר
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

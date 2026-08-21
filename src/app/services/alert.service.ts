import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  success(message: string, title: string = 'Succès !'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#3b82f6',
      timer: 2200,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  }

  error(message: string, title: string = 'Une erreur est survenue'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#ef4444',
    });
  }

  warning(message: string, title: string = 'Attention'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonColor: '#f59e0b',
    });
  }

  info(message: string, title: string = 'Information'): void {
    Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonColor: '#3b82f6',
      timer: 2200,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  }

  async confirm(title: string, text: string): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
    });

    return result.isConfirmed;
  }
}
